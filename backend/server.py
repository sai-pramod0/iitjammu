from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

DOMAIN_PRICES = {".com": 12.99, ".io": 24.99, ".co": 14.99, ".dev": 19.99, ".app": 16.99}

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SUBSCRIPTION_PLANS = {
    "free": {"name": "Free", "price": 0.00, "features": ["Basic CRM", "5 Projects", "Email Support"]},
    "professional": {"name": "Professional", "price": 29.99, "features": ["Full CRM", "Unlimited Projects", "HR Module", "Priority Support"]},
    "enterprise": {"name": "Enterprise", "price": 99.99, "features": ["All Modules", "Audit Logs", "Custom Roles", "Dedicated Support", "API Access"]}
}

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {"user_id": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_roles(*roles):
    async def dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dep

async def log_audit(user_id, user_name, action, resource, details=""):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "user_name": user_name,
        "action": action, "resource": resource, "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

async def create_notification(user_id, title, message, notif_type="system"):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": notif_type,
        "title": title, "message": message, "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

# ==================== MODELS ====================

class LoginRequest(BaseModel):
    email: str
    password: str

class BiometricRegisterRequest(BaseModel):
    credential_id: str

class BiometricLoginRequest(BaseModel):
    credential_id: str
    user_email: str

class LeadCreate(BaseModel):
    name: str
    email: str
    company: str
    status: str = "new"
    value: float = 0.0

class DealCreate(BaseModel):
    title: str
    value: float
    stage: str = "prospecting"
    lead_id: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "todo"
    priority: str = "medium"
    project: str = "Default"
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    project: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None

class LeaveCreate(BaseModel):
    type: str
    start_date: str
    end_date: str
    reason: str = ""

class LeaveUpdate(BaseModel):
    status: str

class InvoiceItem(BaseModel):
    description: str
    quantity: int = 1
    rate: float

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: str
    items: List[InvoiceItem]
    due_date: str

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str = "other"

class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str

class UserRoleUpdate(BaseModel):
    role: str

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["role"])
    await log_audit(user["id"], user["name"], "login", "auth", "Password login")
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user

@api_router.post("/auth/biometric/register")
async def biometric_register(req: BiometricRegisterRequest, user=Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"biometric_credential_id": req.credential_id, "biometric_enabled": True}}
    )
    await log_audit(user["id"], user["name"], "biometric_register", "auth", "Registered biometric credential")
    await create_notification(user["id"], "Biometric Registered", "Your biometric authentication has been enabled.", "system")
    return {"status": "ok", "message": "Biometric registered"}

@api_router.post("/auth/biometric/login")
async def biometric_login(req: BiometricLoginRequest):
    user = await db.users.find_one(
        {"email": req.user_email, "biometric_credential_id": req.credential_id, "biometric_enabled": True},
        {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="Biometric authentication failed")
    token = create_token(user["id"], user["role"])
    await log_audit(user["id"], user["name"], "login", "auth", "Biometric login")
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}

# ==================== CRM ROUTES ====================

@api_router.get("/crm/leads")
async def get_leads(user=Depends(get_current_user)):
    return await db.leads.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/crm/leads")
async def create_lead(lead: LeadCreate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    doc = {"id": str(uuid.uuid4()), **lead.model_dump(), "assigned_to": user["id"], "created_by": user["id"],
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.leads.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "leads", f"Created lead: {lead.name}")
    doc.pop("_id", None)
    return doc

@api_router.put("/crm/leads/{lead_id}")
async def update_lead(lead_id: str, lead: LeadCreate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    result = await db.leads.update_one({"id": lead_id}, {"$set": {**lead.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    await log_audit(user["id"], user["name"], "update", "leads", f"Updated lead: {lead_id}")
    return await db.leads.find_one({"id": lead_id}, {"_id": 0})

@api_router.delete("/crm/leads/{lead_id}")
async def delete_lead(lead_id: str, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    await log_audit(user["id"], user["name"], "delete", "leads", f"Deleted lead: {lead_id}")
    return {"status": "ok"}

@api_router.get("/crm/deals")
async def get_deals(user=Depends(get_current_user)):
    return await db.deals.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/crm/deals")
async def create_deal(deal: DealCreate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    doc = {"id": str(uuid.uuid4()), **deal.model_dump(), "assigned_to": user["id"], "created_by": user["id"],
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.deals.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "deals", f"Created deal: {deal.title}")
    doc.pop("_id", None)
    return doc

# ==================== PROJECTS ROUTES ====================

@api_router.get("/projects/tasks")
async def get_tasks(user=Depends(get_current_user)):
    return await db.tasks.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/projects/tasks")
async def create_task(task: TaskCreate, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **task.model_dump(), "assigned_to": user["id"], "created_by": user["id"],
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.tasks.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "tasks", f"Created task: {task.title}")
    doc.pop("_id", None)
    return doc

@api_router.put("/projects/tasks/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in task.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    await log_audit(user["id"], user["name"], "update", "tasks", f"Updated task: {task_id}")
    return await db.tasks.find_one({"id": task_id}, {"_id": 0})

@api_router.delete("/projects/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    await log_audit(user["id"], user["name"], "delete", "tasks", f"Deleted task: {task_id}")
    return {"status": "ok"}

# ==================== HR ROUTES ====================

@api_router.get("/hr/employees")
async def get_employees(user=Depends(get_current_user)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.get("/hr/leaves")
async def get_leaves(user=Depends(get_current_user)):
    if user["role"] in ["super_admin", "main_handler", "admin"]:
        return await db.leaves.find({}, {"_id": 0}).to_list(1000)
    return await db.leaves.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)

@api_router.post("/hr/leaves")
async def create_leave(leave: LeaveCreate, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user["name"],
           **leave.model_dump(), "status": "pending", "approved_by": None,
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.leaves.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "leaves", "Created leave request")
    await create_notification(user["id"], "Leave Submitted", f"Your {leave.type} leave request has been submitted.", "email")
    doc.pop("_id", None)
    return doc

@api_router.put("/hr/leaves/{leave_id}")
async def update_leave(leave_id: str, update: LeaveUpdate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    result = await db.leaves.update_one({"id": leave_id}, {"$set": {"status": update.status, "approved_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    await log_audit(user["id"], user["name"], "update", "leaves", f"Updated leave: {leave_id} -> {update.status}")
    await create_notification(leave["user_id"], f"Leave {update.status.title()}", f"Your leave request has been {update.status}.", "email")
    return leave

# ==================== FINANCE ROUTES ====================

@api_router.get("/finance/invoices")
async def get_invoices(user=Depends(get_current_user)):
    return await db.invoices.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/finance/invoices")
async def create_invoice(invoice: InvoiceCreate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    total = sum(item.quantity * item.rate for item in invoice.items)
    inv_count = await db.invoices.count_documents({})
    doc = {"id": str(uuid.uuid4()), "invoice_number": f"INV-{inv_count + 1001:04d}",
           "client_name": invoice.client_name, "client_email": invoice.client_email,
           "items": [i.model_dump() for i in invoice.items], "total": total, "status": "draft",
           "due_date": invoice.due_date, "created_by": user["id"],
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.invoices.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "invoices", f"Created invoice: {doc['invoice_number']}")
    await create_notification(user["id"], "Invoice Created", f"Invoice {doc['invoice_number']} for {invoice.client_name}", "email")
    doc.pop("_id", None)
    return doc

@api_router.get("/finance/expenses")
async def get_expenses(user=Depends(get_current_user)):
    if user["role"] in ["super_admin", "main_handler", "admin"]:
        return await db.expenses.find({}, {"_id": 0}).to_list(1000)
    return await db.expenses.find({"submitted_by": user["id"]}, {"_id": 0}).to_list(1000)

@api_router.post("/finance/expenses")
async def create_expense(expense: ExpenseCreate, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **expense.model_dump(), "status": "pending",
           "submitted_by": user["id"], "submitted_by_name": user["name"],
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.expenses.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "expenses", f"Submitted expense: {expense.title}")
    doc.pop("_id", None)
    return doc

# ==================== SUBSCRIPTION & PAYMENT ROUTES ====================

@api_router.get("/subscriptions/plans")
async def get_plans():
    return SUBSCRIPTION_PLANS

@api_router.post("/subscriptions/checkout")
async def create_checkout(req: CheckoutRequest, request: Request, user=Depends(get_current_user)):
    if req.plan_id not in SUBSCRIPTION_PLANS or req.plan_id == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan = SUBSCRIPTION_PLANS[req.plan_id]
    amount = float(plan["price"])

    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest as StripeSessionReq, CheckoutSessionResponse

    host_url = req.origin_url
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{host_url}/subscription?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/subscription"

    checkout_req = StripeSessionReq(
        amount=amount, currency="usd", success_url=success_url, cancel_url=cancel_url,
        metadata={"user_id": user["id"], "plan_id": req.plan_id, "user_email": user["email"]}
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session.session_id,
        "amount": amount, "currency": "usd", "plan": req.plan_id, "payment_status": "initiated",
        "metadata": {"plan_id": req.plan_id, "user_email": user["email"]},
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
    })
    await log_audit(user["id"], user["name"], "checkout", "subscriptions", f"Started checkout for {req.plan_id}")
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/subscriptions/status/{session_id}")
async def get_checkout_status(session_id: str, user=Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if txn and txn["payment_status"] != "paid":
        new_status = status.payment_status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if new_status == "paid":
            plan_id = txn.get("plan") or status.metadata.get("plan_id", "professional")
            await db.users.update_one({"id": user["id"]}, {"$set": {"subscription": plan_id}})
            await create_notification(user["id"], "Subscription Activated", f"Your {plan_id.title()} plan is now active!", "email")
            await log_audit(user["id"], user["name"], "subscription_activated", "subscriptions", f"Activated {plan_id}")

    return {"status": status.status, "payment_status": status.payment_status,
            "amount_total": status.amount_total, "currency": status.currency}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        body = await request.body()
        sig_header = request.headers.get("Stripe-Signature")
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, sig_header)
        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)

@api_router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"status": "ok"}

@api_router.put("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"status": "ok"}

# ==================== AUDIT LOGS ====================

@api_router.get("/audit-logs")
async def get_audit_logs(user=Depends(require_roles("super_admin", "main_handler"))):
    return await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

# ==================== USER MANAGEMENT ====================

@api_router.get("/users")
async def get_users(user=Depends(require_roles("super_admin", "main_handler"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, update: UserRoleUpdate, user=Depends(require_roles("super_admin"))):
    valid_roles = ["super_admin", "main_handler", "admin", "employee"]
    if update.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": update.role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_audit(user["id"], user["name"], "update_role", "users", f"Changed role of {user_id} to {update.role}")
    return {"status": "ok"}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    leads = await db.leads.count_documents({})
    deals = await db.deals.count_documents({})
    tasks = await db.tasks.count_documents({})
    employees = await db.users.count_documents({})
    pending_leaves = await db.leaves.count_documents({"status": "pending"})
    invoices = await db.invoices.count_documents({})
    paid_invoices = await db.invoices.find({"status": "paid"}, {"_id": 0, "total": 1}).to_list(1000)
    total_revenue = sum(inv.get("total", 0) for inv in paid_invoices)
    pending_expenses = await db.expenses.count_documents({"status": "pending"})
    return {"leads": leads, "deals": deals, "tasks": tasks, "employees": employees,
            "pending_leaves": pending_leaves, "invoices": invoices,
            "total_revenue": total_revenue, "pending_expenses": pending_expenses}

# ==================== SEED DATA ====================

async def seed_database():
    user_count = await db.users.count_documents({})
    if user_count > 0:
        return
    logger.info("Seeding database...")

    users = [
        {"id": str(uuid.uuid4()), "email": "superadmin@enterprise.com", "name": "Marcus Chen",
         "password_hash": hash_password("SuperAdmin123"), "role": "super_admin", "department": "executive",
         "subscription": "enterprise", "biometric_enabled": False, "biometric_credential_id": None,
         "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "handler@enterprise.com", "name": "Sarah Rodriguez",
         "password_hash": hash_password("Handler123"), "role": "main_handler", "department": "operations",
         "subscription": "professional", "biometric_enabled": False, "biometric_credential_id": None,
         "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "admin@enterprise.com", "name": "James Wilson",
         "password_hash": hash_password("Admin123"), "role": "admin", "department": "sales",
         "subscription": "professional", "biometric_enabled": False, "biometric_credential_id": None,
         "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "employee@enterprise.com", "name": "Emily Park",
         "password_hash": hash_password("Employee123"), "role": "employee", "department": "engineering",
         "subscription": "free", "biometric_enabled": False, "biometric_credential_id": None,
         "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.users.insert_many(users)

    now = datetime.now(timezone.utc).isoformat()
    await db.leads.insert_many([
        {"id": str(uuid.uuid4()), "name": "Acme Corp", "email": "contact@acme.com", "company": "Acme Corporation",
         "status": "qualified", "value": 75000.00, "assigned_to": users[2]["id"], "created_by": users[2]["id"],
         "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "TechStart Inc", "email": "info@techstart.io", "company": "TechStart",
         "status": "new", "value": 25000.00, "assigned_to": users[2]["id"], "created_by": users[2]["id"],
         "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Global Solutions", "email": "sales@globalsol.com", "company": "Global Solutions Ltd",
         "status": "contacted", "value": 120000.00, "assigned_to": users[2]["id"], "created_by": users[2]["id"],
         "created_at": now, "updated_at": now},
    ])

    await db.deals.insert_many([
        {"id": str(uuid.uuid4()), "title": "Enterprise License Deal", "value": 50000.00, "stage": "negotiation",
         "lead_id": None, "assigned_to": users[2]["id"], "created_by": users[2]["id"], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "title": "SaaS Integration", "value": 15000.00, "stage": "proposal",
         "lead_id": None, "assigned_to": users[2]["id"], "created_by": users[2]["id"], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "title": "Cloud Migration", "value": 85000.00, "stage": "prospecting",
         "lead_id": None, "assigned_to": users[2]["id"], "created_by": users[2]["id"], "created_at": now, "updated_at": now},
    ])

    await db.tasks.insert_many([
        {"id": str(uuid.uuid4()), "title": "Design System Audit", "description": "Review and update design tokens",
         "status": "in_progress", "priority": "high", "project": "Platform", "assigned_to": users[3]["id"],
         "created_by": users[1]["id"], "due_date": "2026-03-15", "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "title": "API Documentation", "description": "Write API docs for v2",
         "status": "todo", "priority": "medium", "project": "Platform", "assigned_to": users[3]["id"],
         "created_by": users[1]["id"], "due_date": "2026-03-20", "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "title": "Performance Testing", "description": "Load test the checkout flow",
         "status": "review", "priority": "urgent", "project": "Commerce", "assigned_to": users[3]["id"],
         "created_by": users[2]["id"], "due_date": "2026-02-28", "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "title": "User Research", "description": "Conduct UX interviews",
         "status": "done", "priority": "low", "project": "Platform", "assigned_to": users[3]["id"],
         "created_by": users[1]["id"], "due_date": "2026-02-20", "created_at": now, "updated_at": now},
    ])

    await db.leaves.insert_many([
        {"id": str(uuid.uuid4()), "user_id": users[3]["id"], "user_name": users[3]["name"],
         "type": "annual", "start_date": "2026-03-10", "end_date": "2026-03-14",
         "reason": "Family vacation", "status": "pending", "approved_by": None, "created_at": now, "updated_at": now},
    ])

    await db.invoices.insert_many([
        {"id": str(uuid.uuid4()), "invoice_number": "INV-1001", "client_name": "Acme Corp",
         "client_email": "billing@acme.com", "items": [{"description": "Consulting Services", "quantity": 40, "rate": 150.00}],
         "total": 6000.00, "status": "paid", "due_date": "2026-02-28", "created_by": users[2]["id"],
         "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "invoice_number": "INV-1002", "client_name": "TechStart",
         "client_email": "pay@techstart.io", "items": [{"description": "Software License", "quantity": 1, "rate": 5000.00}],
         "total": 5000.00, "status": "sent", "due_date": "2026-03-15", "created_by": users[2]["id"],
         "created_at": now, "updated_at": now},
    ])

    await db.expenses.insert_many([
        {"id": str(uuid.uuid4()), "title": "Team Lunch", "amount": 250.00, "category": "meals",
         "status": "approved", "submitted_by": users[3]["id"], "submitted_by_name": users[3]["name"],
         "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "title": "Software License - Figma", "amount": 45.00, "category": "software",
         "status": "pending", "submitted_by": users[3]["id"], "submitted_by_name": users[3]["name"],
         "created_at": now, "updated_at": now},
    ])

    for u in users:
        await create_notification(u["id"], "Welcome to Enterprise One", "Your account has been set up. Explore the workspace!", "system")
    logger.info("Database seeded successfully")

@app.on_event("startup")
async def startup():
    await seed_database()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
