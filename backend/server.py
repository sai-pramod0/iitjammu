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

mongo_url = os.environ.get('MONGODB_URL', os.environ.get('MONGO_URL', 'mongodb://localhost:27017/enterprise_db'))
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
    user_doc = await db.users.find_one({"id": user_id})
    company = user_doc.get("company") if user_doc else None
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "user_name": user_name,
        "action": action, "resource": resource, "details": details,
        "tenant_company": company,
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
    biometric_type: str = "fingerprint"

class BiometricLoginRequest(BaseModel):
    credential_id: str
    user_email: str

class PaymentMethodRequest(BaseModel):
    card_number: str
    expiry: str
    cvc: str
    cardholder_name: str

class UserCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    department: str = "general"

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

class DomainCheckRequest(BaseModel):
    domain: str

class DomainPurchaseRequest(BaseModel):
    domain: str
    email: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    company: str
    domain: str = ""

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        logger.warning(f"Login failed: User not found for email {email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        logger.warning(f"Login failed: Password mismatch for email {email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    await log_audit(user["id"], user["name"], "login", "auth", "Password login")
    return {
        "token": token, 
        "user": {k: v for k, v in user.items() if k != "password_hash"},
        "biometric_setup_required": user.get("biometric_setup_required", False)
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user

@api_router.post("/auth/biometric/register")
async def biometric_register(req: BiometricRegisterRequest, user=Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "biometric_credential_id": req.credential_id,
            "biometric_type": req.biometric_type,
            "biometric_enabled": True,
            "biometric_setup_required": False  # CLEAR FLAG
        }}
    )
    await log_audit(user["id"], user["name"], "biometric_register", "auth", f"Registered {req.biometric_type}")
    await create_notification(user["id"], "Biometric Registered", f"Your {req.biometric_type} authentication has been enabled.", "system")
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
    return await db.leads.find({"tenant_company": user.get("company")}, {"_id": 0}).to_list(1000)

@api_router.post("/crm/leads")
async def create_lead(lead: LeadCreate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    doc = {"id": str(uuid.uuid4()), **lead.model_dump(), "assigned_to": user["id"], "created_by": user["id"],
           "tenant_company": user.get("company"),
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.leads.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "leads", f"Created lead: {lead.name}")
    doc.pop("_id", None)
    return doc

@api_router.put("/crm/leads/{lead_id}")
async def update_lead(lead_id: str, lead: LeadCreate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    result = await db.leads.update_one({"id": lead_id, "tenant_company": user.get("company")}, {"$set": {**lead.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found or access denied")
    await log_audit(user["id"], user["name"], "update", "leads", f"Updated lead: {lead_id}")
    return await db.leads.find_one({"id": lead_id}, {"_id": 0})

@api_router.delete("/crm/leads/{lead_id}")
async def delete_lead(lead_id: str, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    result = await db.leads.delete_one({"id": lead_id, "tenant_company": user.get("company")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found or access denied")
    await log_audit(user["id"], user["name"], "delete", "leads", f"Deleted lead: {lead_id}")
    return {"status": "ok"}

@api_router.get("/crm/deals")
async def get_deals(user=Depends(get_current_user)):
    return await db.deals.find({"tenant_company": user.get("company")}, {"_id": 0}).to_list(1000)

@api_router.post("/crm/deals")
async def create_deal(deal: DealCreate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    doc = {"id": str(uuid.uuid4()), **deal.model_dump(), "assigned_to": user["id"], "created_by": user["id"],
           "tenant_company": user.get("company"),
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.deals.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "deals", f"Created deal: {deal.title}")
    doc.pop("_id", None)
    return doc

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    value: float
    client_name: str
    client_email: str
    status: str = "active"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    value: Optional[float] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    status: Optional[str] = None

# ==================== PROJECTS ROUTES ====================

@api_router.get("/projects")
async def get_projects(user=Depends(get_current_user)):
    return await db.projects.find({"tenant_company": user.get("company")}, {"_id": 0}).to_list(1000)

@api_router.post("/projects")
async def create_project(project: ProjectCreate, user=Depends(require_roles("super_admin", "main_handler", "admin", "manager"))):
    doc = {
        "id": str(uuid.uuid4()), 
        **project.model_dump(), 
        "created_by": user["id"],
        "tenant_company": user.get("company"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "projects", f"Created project: {project.name}")
    doc.pop("_id", None)
    return doc

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, update: ProjectUpdate, user=Depends(require_roles("super_admin", "main_handler", "admin", "manager"))):
    existing = await db.projects.find_one({"id": project_id, "tenant_company": user.get("company")})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Check for status change to completed
    if update.status == "completed" and existing.get("status") != "completed":
        # Generate Paid Invoice
        inv_count = await db.invoices.count_documents({"tenant_company": user.get("company")})
        invoice_doc = {
            "id": str(uuid.uuid4()),
            "invoice_number": f"INV-{inv_count + 1001:04d}",
            "client_name": existing.get("client_name"),
            "client_email": existing.get("client_email"),
            "items": [{"description": f"Project Completion: {existing.get('name')}", "quantity": 1, "rate": existing.get("value")}],
            "total": existing.get("value"),
            "status": "paid",  # Automatically PAID
            "due_date": datetime.now(timezone.utc).date().isoformat(),
            "created_by": user["id"],
            "tenant_company": user.get("company"),
            "created_at": datetime.now(timezone.utc).isoformat(), 
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.invoices.insert_one(invoice_doc)
        await log_audit(user["id"], user["name"], "system", "finance", f"Auto-generated invoice for project completion: {existing.get('name')}")
        await create_notification(user["id"], "Project Revenue Logged", f"Project '{existing.get('name')}' completed. ${existing.get('value')} revenue recorded.", "system")

    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    await log_audit(user["id"], user["name"], "update", "projects", f"Updated project: {project_id}")
    return updated_project

@api_router.get("/projects/tasks")
async def get_tasks(user=Depends(get_current_user)):
    return await db.tasks.find({"tenant_company": user.get("company")}, {"_id": 0}).to_list(1000)

@api_router.post("/projects/tasks")
async def create_task(task: TaskCreate, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **task.model_dump(), "assigned_to": user["id"], "created_by": user["id"],
           "tenant_company": user.get("company"),
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.tasks.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "tasks", f"Created task: {task.title}")
    doc.pop("_id", None)
    return doc

@api_router.put("/projects/tasks/{task_id}")
async def update_task(task_id: str, task: TaskUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in task.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tasks.update_one({"id": task_id, "tenant_company": user.get("company")}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
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
    return await db.users.find({"company": user.get("company")}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.get("/hr/leaves")
async def get_leaves(user=Depends(get_current_user)):
    filter_query = {"tenant_company": user.get("company")}
    if user["role"] not in ["super_admin", "main_handler", "admin"]:
        filter_query["user_id"] = user["id"]
    return await db.leaves.find(filter_query, {"_id": 0}).to_list(1000)

@api_router.post("/hr/leaves")
async def create_leave(leave: LeaveCreate, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user["name"],
           **leave.model_dump(), "status": "pending", "approved_by": None,
           "tenant_company": user.get("company"),
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.leaves.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "leaves", "Created leave request")
    await create_notification(user["id"], "Leave Submitted", f"Your {leave.type} leave request has been submitted.", "email")
    doc.pop("_id", None)
    return doc

@api_router.put("/hr/leaves/{leave_id}")
async def update_leave(leave_id: str, update: LeaveUpdate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    result = await db.leaves.update_one({"id": leave_id, "tenant_company": user.get("company")}, {"$set": {"status": update.status, "approved_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave not found or access denied")
    leave = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    await log_audit(user["id"], user["name"], "update", "leaves", f"Updated leave: {leave_id} -> {update.status}")
    await create_notification(leave["user_id"], f"Leave {update.status.title()}", f"Your leave request has been {update.status}.", "email")
    return leave

# ==================== FINANCE ROUTES ====================

@api_router.get("/finance/invoices")
async def get_invoices(user=Depends(get_current_user)):
    return await db.invoices.find({"tenant_company": user.get("company")}, {"_id": 0}).to_list(1000)

@api_router.post("/finance/invoices")
async def create_invoice(invoice: InvoiceCreate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    total = sum(item.quantity * item.rate for item in invoice.items)
    inv_count = await db.invoices.count_documents({"tenant_company": user.get("company")})
    doc = {"id": str(uuid.uuid4()), "invoice_number": f"INV-{inv_count + 1001:04d}",
           "client_name": invoice.client_name, "client_email": invoice.client_email,
           "items": [i.model_dump() for i in invoice.items], "total": total, "status": "draft",
           "due_date": invoice.due_date, "created_by": user["id"],
           "tenant_company": user.get("company"),
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.invoices.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "invoices", f"Created invoice: {doc['invoice_number']}")
    await create_notification(user["id"], "Invoice Created", f"Invoice {doc['invoice_number']} for {invoice.client_name}", "email")
    doc.pop("_id", None)
    return doc

@api_router.get("/finance/expenses")
async def get_expenses(user=Depends(get_current_user)):
    filter_query = {"tenant_company": user.get("company")}
    if user["role"] not in ["super_admin", "main_handler", "admin"]:
        filter_query["submitted_by"] = user["id"]
    return await db.expenses.find(filter_query, {"_id": 0}).to_list(1000)

@api_router.post("/finance/expenses")
async def create_expense(expense: ExpenseCreate, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **expense.model_dump(), "status": "pending",
           "submitted_by": user["id"], "submitted_by_name": user["name"],
           "tenant_company": user.get("company"),
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

@api_router.post("/auth/payment/add")
async def add_payment_method(req: PaymentMethodRequest, user=Depends(get_current_user)):
    # In a real app, this would integrate with Stripe/Payment Provider
    method = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "card_number": f"**** **** **** {req.card_number[-4:]}",
        "expiry": req.expiry,
        "cardholder_name": req.cardholder_name,
        "type": "card",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_methods.insert_one(method)
    await log_audit(user["id"], user["name"], "add_payment_method", "auth", f"Added card ending in {req.card_number[-4:]}")
    method.pop("_id", None)
    return method

@api_router.get("/auth/payment/methods")
async def get_payment_methods(user=Depends(get_current_user)):
    return await db.payment_methods.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)

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
async def get_audit_logs(user=Depends(require_roles("super_admin", "main_handler", "admin", "ceo", "hr"))):
    filter_query = {}
    if user["role"] not in ["super_admin", "main_handler"]:
        filter_query["tenant_company"] = user.get("company")
    return await db.audit_logs.find(filter_query, {"_id": 0}).sort("created_at", -1).to_list(200)

# ==================== USER MANAGEMENT ====================

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    company_description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# ... (Auth Routes)

@api_router.put("/auth/company")
async def update_company_profile(update: CompanyUpdate, user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Update the user's company details (denormalized for now, or update all users in company)
    # Ideally, we should have a separate 'companies' collection.
    # For now, we update the current user and we assume 'company' field in user is just the name.
    # We will store company details in the user document itself or a dedicated collection?
    # The existing code uses user['company'] as a string name.
    # Let's verify if we have a companies collection. We don't see one used.
    # We will update the user's document with these extra fields.
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    # Also update company name usage if changed? 
    if update.company_name and update.company_name != user.get("company"):
        # Update connection for all users in this company? 
        # This is tricky without a company_id. 
        # For this MVP, we'll just update the user's profile which acts as difference.
        await db.users.update_many({"company": user["company"]}, {"$set": {"company": update.company_name}})
        
    await log_audit(user["id"], user["name"], "update_company", "auth", "Updated company profile")
    return {"status": "ok"}

@api_router.put("/auth/password")
async def change_password(req: PasswordChange, user=Depends(get_current_user)):
    # Verify current
    user_doc = await db.users.find_one({"id": user["id"]})
    if not verify_password(req.current_password, user_doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    new_hash = hash_password(req.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash}})
    await log_audit(user["id"], user["name"], "change_password", "auth", "Changed password")
    return {"status": "ok"}

# ==================== USER MANAGEMENT ====================

@api_router.get("/users")
async def get_users(user=Depends(require_roles("super_admin", "main_handler", "admin", "ceo", "hr", "manager", "server"))):
    # Filter by the requester's company
    company = user.get("company")
    if user["role"] in ["super_admin", "main_handler"] and company == "Enterprise One":
        # Super admins user see everyone (or specific logic)
        return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    return await db.users.find({"company": company}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_roles("super_admin", "main_handler", "admin", "ceo", "hr", "manager"))):
    # Check if target user belongs to same company
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target["company"] != user["company"] and user["role"] not in ["super_admin", "main_handler"]:
         raise HTTPException(status_code=403, detail="Cannot delete user from another company")
         
    await db.users.delete_one({"id": user_id})
    await log_audit(user["id"], user["name"], "delete_user", "users", f"Deleted user {target['email']}")
    return {"status": "ok"}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, update: UserRoleUpdate, user=Depends(require_roles("super_admin", "main_handler", "admin", "ceo"))):
    valid_roles = ["super_admin", "main_handler", "admin", "ceo", "hr", "manager", "server", "employee"]
    if update.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Scoping check
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["company"] != user["company"] and user["role"] not in ["super_admin", "main_handler"]:
         raise HTTPException(status_code=403, detail="Cannot update user from another company")

    result = await db.users.update_one({"id": user_id}, {"$set": {"role": update.role}})
    await log_audit(user["id"], user["name"], "update_role", "users", f"Changed role of {user_id} to {update.role}")
    return {"status": "ok"}

# ==================== EMAIL & NOTIFICATIONS ====================

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")

def send_email(to_email, subject, body):
    if not SMTP_USER or not SMTP_PASS:
        logger.warning(f"Email credentials not set. Mock sending to {to_email}: {subject}")
        return

    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_USER
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")

@api_router.post("/users/create")
async def create_new_user(req: UserCreateRequest, user=Depends(require_roles("super_admin", "main_handler", "admin", "ceo", "hr", "manager"))):
    email = req.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user_id = str(uuid.uuid4())
    # Generate random password if not provided (or use provided)
    # For this flow, we'll assume the admin sets a temporary password, or we could generate one.
    # Using the one from request for now as per previous logic, but sending it via email.
    
    hashed_pw = hash_password(req.password)
    new_user = {
        "id": new_user_id,
        "name": req.name,
        "email": req.email,
        "password_hash": hashed_pw,
        "role": req.role,
        "department": req.department,
        "company": user.get("company", "Enterprise One"),
        "subscription": "free",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "biometric_enabled": False,
        "biometric_setup_required": True # FORCE BIOMETRIC SETUP
    }
    await db.users.insert_one(new_user)
    
    # Send Invitation Email
    email_body = f"""
    <html>
        <body>
            <h2>Welcome to {new_user['company']}</h2>
            <p>Hello {req.name},</p>
            <p>You have been invited to join the <b>{new_user['company']}</b> workspace on Enterprise One.</p>
            <p><b>Your Credentials:</b></p>
            <ul>
                <li>Email: {req.email}</li>
                <li>Temporary Password: {req.password}</li>
            </ul>
            <p>Please log in immediately. You will be required to set up Biometric Authentication (Face ID / Touch ID) upon your first login.</p>
            <br>
            <a href="http://localhost:3000/login">Login to Dashboard</a>
        </body>
    </html>
    """
    send_email(req.email, f"Welcome to {new_user['company']} - Action Required", email_body)
    
    await log_audit(user["id"], user["name"], "create_user", "users", f"Invited user {req.email} as {req.role}")
    return {"status": "ok", "message": "User invited successfully", "user_id": new_user_id}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    company = user.get("company")
    filter_query = {"tenant_company": company}
    user_filter = {"company": company}
    
    leads = await db.leads.count_documents(filter_query)
    deals = await db.deals.count_documents(filter_query)
    tasks = await db.tasks.count_documents(filter_query)
    employees = await db.users.count_documents(user_filter)
    pending_leaves = await db.leaves.count_documents({"status": "pending", "tenant_company": company})
    invoices = await db.invoices.count_documents(filter_query)
    paid_invoices = await db.invoices.find({"status": "paid", "tenant_company": company}, {"_id": 0, "total": 1}).to_list(1000)
    total_revenue = sum(inv.get("total", 0) for inv in paid_invoices)
    pending_expenses = await db.expenses.count_documents({"status": "pending", "tenant_company": company})
    
    return {"leads": leads, "deals": deals, "tasks": tasks, "employees": employees,
            "pending_leaves": pending_leaves, "invoices": invoices,
            "total_revenue": total_revenue, "pending_expenses": pending_expenses}

# ==================== AI ANALYTICS ROUTES ====================

async def calculate_burn_rate(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        return {"metrics": {}}
    
    company = user.get("company")
    expenses = await db.expenses.find({"tenant_company": company}, {"_id": 0}).to_list(1000)
    invoices = await db.invoices.find({"tenant_company": company}, {"_id": 0}).to_list(1000)
    users_count = await db.users.count_documents({"company": company})
    
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    total_revenue = sum(i.get("total", 0) for i in invoices if i.get("status") == "paid")
    net_burn = max(total_expenses - total_revenue, 0)
    
    metrics = {
        "total_expenses": total_expenses, 
        "total_revenue": total_revenue, 
        "net_burn": net_burn,
        "runway_months": round(total_revenue / max(net_burn, 0.01), 1) if net_burn > 0 else 99,
        "employee_count": users_count,
        "burn_per_employee": round(total_expenses / max(users_count, 1), 2)
    }
    return {"metrics": metrics}

@api_router.post("/analytics/burn-rate")
async def analyze_burn_rate(user=Depends(require_roles("super_admin", "main_handler", "admin", "ceo", "manager"))):
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    users_count = await db.users.count_documents({})
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    total_revenue = sum(i.get("total", 0) for i in invoices if i.get("status") == "paid")
    net_burn = max(total_expenses - total_revenue, 0)
    expense_by_cat = {}
    for e in expenses:
        cat = e.get("category", "other")
        expense_by_cat[cat] = expense_by_cat.get(cat, 0) + e.get("amount", 0)
    metrics = {
        "total_expenses": total_expenses, "total_revenue": total_revenue, "net_burn": net_burn,
        "runway_months": round(total_revenue / max(net_burn, 0.01), 1) if net_burn > 0 else 99,
        "employee_count": users_count,
        "burn_per_employee": round(total_expenses / max(users_count, 1), 2),
        "expense_breakdown": [{"category": k, "amount": v} for k, v in expense_by_cat.items()],
        "revenue_vs_expense": [{"name": "Revenue", "value": total_revenue}, {"name": "Expenses", "value": total_expenses}]
    }
    ai_response = ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"burn-{uuid.uuid4()}", system_message="You are a senior financial analyst specializing in startup burn rate analysis. Be concise, data-driven, and actionable. Use bullet points for recommendations.").with_model("openai", "gpt-5.2")
        prompt = f"""Analyze this company's burn rate:
- Total Expenses: ${total_expenses}
- Total Revenue: ${total_revenue}
- Net Burn Rate: ${net_burn}/month
- Employees: {users_count}, Burn/Employee: ${metrics['burn_per_employee']}
- Expense Breakdown: {json.dumps(expense_by_cat)}
- Invoices: {len(invoices)} total, {sum(1 for i in invoices if i.get('status')=='paid')} paid

Provide: 1) Burn rate health assessment 2) Risk level (Low/Medium/High/Critical) 3) Runway analysis 4) Top 3 cost optimization recommendations with estimated savings."""
        ai_response = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"AI burn rate error: {e}")
        ai_response = "AI analysis temporarily unavailable. Review metrics for manual assessment."
    await log_audit(user["id"], user["name"], "analyze", "analytics", "Burn rate analysis")
    return {"metrics": metrics, "ai_analysis": ai_response}

@api_router.post("/analytics/unit-economics")
async def analyze_unit_economics(user=Depends(require_roles("super_admin", "main_handler", "admin", "ceo", "manager"))):
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    users_count = await db.users.count_documents({})
    total_revenue = sum(i.get("total", 0) for i in invoices if i.get("status") == "paid")
    total_deal_value = sum(d.get("value", 0) for d in deals)
    won_deals = [d for d in deals if d.get("stage") == "closed_won"]
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    marketing_exp = sum(e.get("amount", 0) for e in expenses if e.get("category") == "marketing")
    num_customers = max(len(won_deals), len([i for i in invoices if i.get("status") == "paid"]), 1)
    cac = round(max(marketing_exp, total_expenses * 0.3) / max(num_customers, 1), 2)
    arpu = round(total_revenue / max(num_customers, 1), 2)
    ltv = round(arpu * 12, 2)
    ltv_cac = round(ltv / max(cac, 0.01), 2)
    payback = round(cac / max(arpu / 12, 0.01), 1) if arpu > 0 else 0
    gross_margin = round((total_revenue - total_expenses) / max(total_revenue, 0.01) * 100, 1)
    rev_per_emp = round(total_revenue / max(users_count, 1), 2)
    conversion = round(len(won_deals) / max(len(leads), 1) * 100, 1) if leads else 0
    metrics = {
        "cac": cac, "ltv": ltv, "ltv_cac_ratio": ltv_cac, "payback_months": payback, "arpu": arpu,
        "gross_margin": gross_margin, "revenue_per_employee": rev_per_emp,
        "total_customers": num_customers, "conversion_rate": conversion,
        "total_leads": len(leads), "total_deals": len(deals), "pipeline_value": total_deal_value,
        "deal_stages": [
            {"stage": s.replace("_", " ").title(), "count": len([d for d in deals if d.get("stage") == s]),
             "value": sum(d.get("value", 0) for d in deals if d.get("stage") == s)}
            for s in ["prospecting", "negotiation", "proposal", "closed_won", "closed_lost"]
        ]
    }
    ai_response = ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"ue-{uuid.uuid4()}", system_message="You are a SaaS unit economics expert. Analyze metrics and provide strategic recommendations with specific numbers. Use bullet points.").with_model("openai", "gpt-5.2")
        prompt = f"""Analyze unit economics:
- CAC: ${cac}, LTV: ${ltv}, LTV/CAC: {ltv_cac}x, Payback: {payback} months
- ARPU: ${arpu}, Gross Margin: {gross_margin}%, Revenue/Employee: ${rev_per_emp}
- Pipeline: {len(leads)} leads, {len(deals)} deals (${total_deal_value} value)
- Conversion: {conversion}%, Customers: {num_customers}

Provide: 1) Health score (1-10) with explanation 2) Strengths and concerns 3) Top 3 growth recommendations to improve LTV/CAC."""
        ai_response = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"AI unit economics error: {e}")
        ai_response = "AI analysis temporarily unavailable."
    await log_audit(user["id"], user["name"], "analyze", "analytics", "Unit economics analysis")
    return {"metrics": metrics, "ai_analysis": ai_response}

@api_router.post("/analytics/project-estimation")
async def analyze_project(request: Request, user=Depends(get_current_user)):
    data = await request.json()
    project_name = data.get("project_name")
    currency = data.get("currency", "INR")  # Default to INR
    
    # 1. Gather Project Data (Tasks)
    tasks = await db.tasks.find({"tenant_company": user.get("company"), "project": project_name}, {"_id": 0}).to_list(1000)
    
    if not tasks:
        return {"error": "No tasks found for this project"}

    # 2. Estimate Revenue/Cost
    # Rates: INR defaults to ₹3000/hr, USD to $40/hr
    rates = {
        "INR": 3000, "USD": 40, "EUR": 35, "GBP": 30, "AUD": 60, "CAD": 55, "JPY": 5000
    }
    hourly_rate = rates.get(currency, 3000)
    currency_symbol = "₹" if currency == "INR" else "$" if currency in ["USD", "AUD", "CAD"] else "€" if currency == "EUR" else "£" if currency == "GBP" else "¥"
    
    hours_map = {"low": 2, "medium": 4, "high": 8, "urgent": 16}
    
    total_hours = 0
    breakdown = []
    
    for t in tasks:
        h = hours_map.get(t.get("priority", "medium"), 4)
        total_hours += h
        breakdown.append({"task": t.get("title"), "hours": h, "cost": h * hourly_rate})
        
    estimated_revenue = total_hours * hourly_rate
    
    # 3. Generate Analysis & Quotation
    ai_response = ""
    start_date = datetime.now().strftime("%B %d, %Y")
    valid_until = (datetime.now() + timedelta(days=30)).strftime("%B %d, %Y")

    def generate_professional_html(is_ai=False, content=""):
        # Base styles for professional document
        return f"""
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h1 style="margin: 0; font-size: 28px; color: #2c3e50;">PROJECT QUOTATION</h1>
                    <p style="margin: 5px 0 0; color: #7f8c8d; font-size: 14px;">Reference: REF-{uuid.uuid4().hex[:8].upper()}</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0; color: #2c3e50;">StartupOps Inc.</h3>
                    <p style="margin: 5px 0 0; font-size: 12px; color: #7f8c8d;">123 Innovation Drive<br>Tech Valley, CA 94043<br>contact@startupops.com</p>
                </div>
            </div>

            <div style="margin-bottom: 40px; display: flex; justify-content: space-between;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; width: 45%;">
                    <h4 style="margin: 0 0 10px; color: #7f8c8d; font-size: 12px; text-transform: uppercase;">Client</h4>
                    <p style="margin: 0; font-weight: bold; color: #2c3e50;">{user.get('company', 'Valued Client')}</p>
                    <p style="margin: 5px 0 0; font-size: 13px;">Attn: {user.get('name', 'Project Lead')}</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; width: 45%;">
                    <h4 style="margin: 0 0 10px; color: #7f8c8d; font-size: 12px; text-transform: uppercase;">Project Details</h4>
                    <p style="margin: 0; font-weight: bold; color: #2c3e50;">{project_name}</p>
                    <p style="margin: 5px 0 0; font-size: 13px;">Date: {start_date}<br>Valid Until: {valid_until}</p>
                </div>
            </div>

            {content}

            <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 12px; color: #95a5a6;">
                <p>This quotation is subject to our Standard Terms & Conditions. Payment terms: 50% upfront, 50% upon completion.</p>
                <p>&copy; {datetime.now().year} StartupOps Inc. All rights reserved.</p>
            </div>
        </div>
        """

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"proj-{uuid.uuid4()}", system_message="You are a Senior Project Manager. Output ONLY the body content of a formal quotation (Executive Summary, Scope, Commercials, Timeline). Do NOT include <html> or <body> tags. Use <h3> for section headers. Use <table> for data. Write in a highly professional tone.").with_model("openai", "gpt-5.2")
        
        prompt = f"""Project: {project_name}
        Currency: {currency} ({currency_symbol})
        Total Hours: {total_hours}
        Rate: {currency_symbol}{hourly_rate}/hr
        Total: {currency_symbol}{estimated_revenue:,}
        Tasks: {len(tasks)} ({', '.join([b['task'] for b in breakdown[:5]])}...)
        
        Write the:
        1. Executive Summary
        2. Scope of Work (Bullet points)
        3. Commercial Terms (Table with Description, Hours, Rate, Total)
        4. Project Timeline
        """
        
        raw_ai_body = await chat.send_message(UserMessage(text=prompt))
        if "mock AI" in raw_ai_body or len(raw_ai_body) < 50:
             raise Exception("AI returned mock or empty response")
        ai_response = generate_professional_html(is_ai=True, content=raw_ai_body)
        
    except Exception as e:
        logger.warning(f"AI generation failed/mocked: {e}")
        # FALLBACK TEMPLATE
        fallback_content = f"""
        <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Executive Summary</h3>
        <p>StartupOps is pleased to submit this proposal for <strong>{project_name}</strong>. Based on our analysis of the requirements, we have outlined the scope, estimated timeline, and commercial terms below. Our team is ready to execute this project with the highest standards of quality.</p>
        
        <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Scope of Work</h3>
        <ul style="list-style-type: none; padding: 0;">
            {''.join([f'<li style="margin-bottom: 8px; padding-left: 20px; position: relative;">• {t["task"]} ({t["hours"]}h)</li>' for t in breakdown[:8]])}
            {f'<li style="font-style: italic; color: #7f8c8d; margin-top: 5px;">...and {len(tasks)-8} more tasks.</li>' if len(tasks) > 8 else ''}
        </ul>
        
        <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Commercial Terms</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background: #f8f9fa; text-align: left;">
                <th style="padding: 12px; border-bottom: 2px solid #ddd;">Description</th>
                <th style="padding: 12px; border-bottom: 2px solid #ddd;">Hours</th>
                <th style="padding: 12px; border-bottom: 2px solid #ddd;">Rate</th>
                <th style="padding: 12px; border-bottom: 2px solid #ddd;">Total</th>
            </tr>
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">Development Services</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">{total_hours}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">{currency_symbol}{hourly_rate}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>{currency_symbol}{estimated_revenue:,}</strong></td>
            </tr>
        </table>
        
        <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Timeline</h3>
        <p>Estimated Duration: <strong>{max(1, int(total_hours / 30))} weeks</strong> (based on current velocity).</p>
        """
        ai_response = generate_professional_html(is_ai=False, content=fallback_content)

    await log_audit(user["id"], user["name"], "analyze_project", "projects", f"Analyzed {project_name}")
    
    return {
        "project": project_name,
        "total_tasks": len(tasks),
        "total_hours": total_hours,
        "estimated_cost": estimated_revenue,
        "currency": currency,
        "currency_symbol": currency_symbol,
        "ai_quotation": ai_response
    }

@api_router.post("/analytics/product-optimization")
async def analyze_product_optimization(user=Depends(require_roles("super_admin", "main_handler", "admin"))):
    audit_logs = await db.audit_logs.find({}, {"_id": 0}).to_list(1000)
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    feature_usage = {}
    user_activity = {}
    action_types = {}
    for log in audit_logs:
        resource = log.get("resource", "other")
        feature_usage[resource] = feature_usage.get(resource, 0) + 1
        uname = log.get("user_name", "Unknown")
        user_activity[uname] = user_activity.get(uname, 0) + 1
        action = log.get("action", "unknown")
        action_types[action] = action_types.get(action, 0) + 1
    completed = len([t for t in tasks if t.get("status") == "done"])
    task_completion = round(completed / max(len(tasks), 1) * 100, 1)
    qualified = len([l for l in leads if l.get("status") == "qualified"])
    lead_conversion = round(qualified / max(len(leads), 1) * 100, 1)
    task_by_status = {}
    for t in tasks:
        s = t.get("status", "unknown")
        task_by_status[s] = task_by_status.get(s, 0) + 1
    metrics = {
        "feature_usage": [{"feature": k, "count": v} for k, v in sorted(feature_usage.items(), key=lambda x: -x[1])],
        "user_activity": [{"user": k, "actions": v} for k, v in sorted(user_activity.items(), key=lambda x: -x[1])],
        "action_breakdown": [{"action": k, "count": v} for k, v in sorted(action_types.items(), key=lambda x: -x[1])],
        "task_completion_rate": task_completion, "lead_conversion_rate": lead_conversion,
        "task_distribution": [{"status": k.replace("_", " ").title(), "count": v} for k, v in task_by_status.items()],
        "total_actions": len(audit_logs), "active_users": len(user_activity),
    }
    ai_response = ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"po-{uuid.uuid4()}", system_message="You are a product analytics expert. Analyze user behavior and suggest data-driven optimizations. Use bullet points.").with_model("openai", "gpt-5.2")
        prompt = f"""Analyze product usage:
- Feature Usage: {json.dumps(dict(list(feature_usage.items())[:10]))}
- {len(user_activity)} active users, {len(audit_logs)} total actions
- Actions: {json.dumps(dict(list(action_types.items())[:10]))}
- Task Completion: {task_completion}%, Lead Conversion: {lead_conversion}%
- Tasks: {json.dumps(task_by_status)}

Provide: 1) Engagement assessment 2) Feature adoption gaps 3) Top 3 optimization recommendations with expected impact."""
        ai_response = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"AI product optimization error: {e}")
        ai_response = "AI analysis temporarily unavailable."
    await log_audit(user["id"], user["name"], "analyze", "analytics", "Product optimization analysis")
    return {"metrics": metrics, "ai_analysis": ai_response}

# ==================== FEEDBACK & VALIDATION ROUTES ====================

class FeedbackCreate(BaseModel):
    content: str
    sentiment: str = "neutral"

class IdeaCreate(BaseModel):
    title: str
    description: str
    category: str = "feature"
    priority: str = "medium"

@api_router.get("/validation/ideas")
async def get_ideas(user=Depends(get_current_user)):
    return await db.ideas.find({}, {"_id": 0}).sort("votes", -1).to_list(1000)

@api_router.post("/validation/ideas")
async def create_idea(idea: IdeaCreate, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()), **idea.model_dump(), "votes": 0, "voters": [],
        "feedback": [], "status": "open", "created_by": user["id"], "created_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ideas.insert_one(doc)
    await log_audit(user["id"], user["name"], "create", "ideas", f"Created idea: {idea.title}")
    doc.pop("_id", None)
    return doc

@api_router.post("/validation/ideas/{idea_id}/vote")
async def vote_idea(idea_id: str, user=Depends(get_current_user)):
    idea = await db.ideas.find_one({"id": idea_id})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    if user["id"] in idea.get("voters", []):
        await db.ideas.update_one({"id": idea_id}, {"$inc": {"votes": -1}, "$pull": {"voters": user["id"]}})
        action = "unvoted"
    else:
        await db.ideas.update_one({"id": idea_id}, {"$inc": {"votes": 1}, "$push": {"voters": user["id"]}})
        action = "voted"
    await log_audit(user["id"], user["name"], "vote", "ideas", f"{action.title()} idea: {idea.get('title')}")
    return {"status": "ok", "action": action}

@api_router.post("/validation/ideas/{idea_id}/feedback")
async def add_feedback(idea_id: str, feedback: FeedbackCreate, user=Depends(get_current_user)):
    feedback_doc = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user["name"],
        "content": feedback.content, "sentiment": feedback.sentiment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.ideas.update_one({"id": idea_id}, {"$push": {"feedback": feedback_doc}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Idea not found")
    await log_audit(user["id"], user["name"], "feedback", "ideas", f"Added feedback to idea {idea_id}")
    return feedback_doc

@api_router.post("/ai/generate-pitch")
async def generate_pitch(user=Depends(get_current_user)):
    # Simulate gathering data
    burn_metrics = await calculate_burn_rate(user["id"])
    
    # Mock AI generation of a pitch deck
    pitch_deck = [
        {
            "slide": 1, "title": "Problem Statement",
            "content": "Startups struggle to track execution and validate ideas efficiently.",
            "visual": "Image of a frustrated founder with disorganized notes."
        },
        {
            "slide": 2, "title": "Solution",
            "content": f"StartupOps: An all-in-one platform for {user.get('company', 'your company')} to manage tasks, team, and finance.",
            "visual": "Screenshot of the Dashboard showing unified metrics."
        },
        {
            "slide": 3, "title": "Market Opportunity",
            "content": "Targeting early-stage founders. robust TAM/SAM/SOM analysis.",
            "visual": "Bar chart showing market growth trends."
        },
        {
            "slide": 4, "title": "Product Demo",
            "content": "Core features: Task Tracking, AI Analytics, and Idea Validation.",
            "visual": "Carousel of product screenshots."
        },
        {
            "slide": 5, "title": "Business Model",
            "content": "SaaS Subscription model with tiered pricing.",
            "visual": "Table showing Free, Pro, and Enterprise plans."
        },
        {
            "slide": 6, "title": "Traction",
            "content": f"Current status: Active user base growing. Revenue: ${burn_metrics['metrics'].get('total_revenue', 0)}",
            "visual": "Line graph of user growth."
        },
        {
            "slide": 7, "title": "Go-to-Market",
            "content": "Content marketing, partnerships with incubators, and product-led growth.",
            "visual": "Funnel diagram of customer acquisition."
        },
        {
            "slide": 8, "title": "Competition",
            "content": "Better than Jira/Asana because we are Founder-First and integrated.",
            "visual": "Comparison matrix."
        },
        {
            "slide": 9, "title": "Team",
            "content": f"Led by {user['name']} and a passionate team of builders.",
            "visual": "Team photos and bios."
        },
        {
            "slide": 10, "title": "Financial Projections",
            "content": f"Projected to reach profitability in {burn_metrics['metrics'].get('runway_months', 12)} months.",
            "visual": "Financial forecast chart."
        }
    ]
    
    await log_audit(user["id"], user["name"], "generate", "pitch", "Generated investor pitch deck")
    return pitch_deck

# ==================== DOMAIN & REGISTRATION ====================

@api_router.post("/domains/check")
async def check_domain(req: DomainCheckRequest):
    base = req.domain.lower().strip().replace(" ", "").split(".")[0]
    if not base or len(base) < 2:
        raise HTTPException(status_code=400, detail="Invalid domain name")
    results = []
    for ext, price in DOMAIN_PRICES.items():
        full = f"{base}{ext}"
        existing = await db.domains.find_one({"domain": full})
        available = existing is None and random.random() > 0.25
        results.append({"domain": full, "available": available, "price": price})
    return results

@api_router.post("/domains/purchase")
async def purchase_domain(req: DomainPurchaseRequest):
    existing = await db.domains.find_one({"domain": req.domain})
    if existing:
        raise HTTPException(status_code=400, detail="Domain already taken")
    doc = {
        "id": str(uuid.uuid4()), "domain": req.domain, "owner_email": req.email,
        "status": "active", "purchased_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
    }
    await db.domains.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    email = req.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "id": str(uuid.uuid4()), "email": email, "name": req.name,
        "password_hash": hash_password(req.password), "role": "admin",
        "department": "general", "subscription": "free", "company": req.company,
        "domain": req.domain, "biometric_enabled": False, "biometric_credential_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_doc["id"], user_doc["role"])
    await log_audit(user_doc["id"], req.name, "register", "auth", f"New user registered: {req.email}")
    await create_notification(user_doc["id"], "Welcome to Enterprise One", f"Account created with {req.email}. Start exploring!", "system")
    return {"token": token, "user": {k: v for k, v in user_doc.items() if k not in ["password_hash", "_id"]}}

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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
