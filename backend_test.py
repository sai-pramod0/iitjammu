#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class EnterpriseAPITester:
    def __init__(self, base_url="https://biometric-rbac.preview.emergentagent.com"):
        self.base_url = base_url
        self.tokens = {}
        self.users = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Demo credentials
        self.demo_accounts = [
            {"email": "superadmin@enterprise.com", "password": "SuperAdmin123", "role": "super_admin"},
            {"email": "handler@enterprise.com", "password": "Handler123", "role": "main_handler"},
            {"email": "admin@enterprise.com", "password": "Admin123", "role": "admin"},
            {"email": "employee@enterprise.com", "password": "Employee123", "role": "employee"},
        ]

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text.strip() else {}
                except:
                    return success, {}
            else:
                error_detail = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_text = response.json()
                    error_detail += f" - {error_text}"
                except:
                    error_detail += f" - {response.text[:100]}"
                print(f"❌ Failed - {error_detail}")
                self.failed_tests.append({"test": name, "error": error_detail})
                return False, {}

        except Exception as e:
            error_msg = f"Exception: {str(e)}"
            print(f"❌ Failed - {error_msg}")
            self.failed_tests.append({"test": name, "error": error_msg})
            return False, {}

    def test_authentication(self):
        """Test authentication for all demo accounts"""
        print("\n🔐 Testing Authentication...")
        
        for account in self.demo_accounts:
            success, response = self.run_test(
                f"Login {account['role']}",
                "POST", 
                "auth/login",
                200,
                data={"email": account["email"], "password": account["password"]}
            )
            
            if success and 'token' in response:
                self.tokens[account['role']] = response['token']
                self.users[account['role']] = response['user']
                print(f"  ✓ Token obtained for {account['role']}")
            else:
                print(f"  ✗ Failed to get token for {account['role']}")

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint for all users"""
        print("\n📊 Testing Dashboard Stats...")
        
        for role, token in self.tokens.items():
            self.run_test(
                f"Dashboard stats for {role}",
                "GET",
                "dashboard/stats",
                200,
                token=token
            )

    def test_crm_module(self):
        """Test CRM endpoints"""
        print("\n💼 Testing CRM Module...")
        
        # Test leads endpoints
        for role, token in self.tokens.items():
            # Get leads
            success, leads_data = self.run_test(
                f"Get leads for {role}",
                "GET",
                "crm/leads",
                200,
                token=token
            )
            
            # Create lead (only for authorized roles)
            if role in ['super_admin', 'main_handler', 'admin']:
                lead_data = {
                    "name": f"Test Lead {datetime.now().strftime('%H%M%S')}",
                    "email": "testlead@example.com",
                    "company": "Test Company",
                    "status": "new",
                    "value": 5000.0
                }
                
                success, new_lead = self.run_test(
                    f"Create lead as {role}",
                    "POST",
                    "crm/leads",
                    200,  # Backend returns 200, not 201
                    data=lead_data,
                    token=token
                )
                
                if success and new_lead.get('id'):
                    # Test update lead
                    update_data = {"name": "Updated Test Lead", "email": "updated@example.com", 
                                 "company": "Updated Company", "status": "contacted", "value": 7500.0}
                    self.run_test(
                        f"Update lead as {role}",
                        "PUT",
                        f"crm/leads/{new_lead['id']}",
                        200,
                        data=update_data,
                        token=token
                    )
                    
                    # Test delete lead
                    self.run_test(
                        f"Delete lead as {role}",
                        "DELETE",
                        f"crm/leads/{new_lead['id']}",
                        200,
                        token=token
                    )
            
        # Test deals endpoints
        for role, token in self.tokens.items():
            # Get deals
            self.run_test(
                f"Get deals for {role}",
                "GET",
                "crm/deals",
                200,
                token=token
            )
            
            # Create deal (only for authorized roles)
            if role in ['super_admin', 'main_handler', 'admin']:
                deal_data = {
                    "title": f"Test Deal {datetime.now().strftime('%H%M%S')}",
                    "value": 10000.0,
                    "stage": "prospecting"
                }
                
                self.run_test(
                    f"Create deal as {role}",
                    "POST",
                    "crm/deals",
                    200,
                    data=deal_data,
                    token=token
                )

    def test_projects_module(self):
        """Test Projects endpoints"""
        print("\n📋 Testing Projects Module...")
        
        for role, token in self.tokens.items():
            # Get tasks
            success, tasks_data = self.run_test(
                f"Get tasks for {role}",
                "GET",
                "projects/tasks",
                200,
                token=token
            )
            
            # Create task (all roles can create tasks)
            task_data = {
                "title": f"Test Task {datetime.now().strftime('%H%M%S')}",
                "description": "Test task description",
                "status": "todo",
                "priority": "medium",
                "project": "Test Project",
                "due_date": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
            }
            
            success, new_task = self.run_test(
                f"Create task as {role}",
                "POST",
                "projects/tasks",
                200,
                data=task_data,
                token=token
            )
            
            if success and new_task.get('id'):
                # Test update task
                update_data = {
                    "status": "in_progress",
                    "priority": "high"
                }
                self.run_test(
                    f"Update task as {role}",
                    "PUT",
                    f"projects/tasks/{new_task['id']}",
                    200,
                    data=update_data,
                    token=token
                )

    def test_hr_module(self):
        """Test HR endpoints"""
        print("\n👥 Testing HR Module...")
        
        for role, token in self.tokens.items():
            # Get employees
            self.run_test(
                f"Get employees for {role}",
                "GET",
                "hr/employees",
                200,
                token=token
            )
            
            # Get leaves
            self.run_test(
                f"Get leaves for {role}",
                "GET",
                "hr/leaves",
                200,
                token=token
            )
            
            # Create leave request
            leave_data = {
                "type": "annual",
                "start_date": (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d'),
                "end_date": (datetime.now() + timedelta(days=12)).strftime('%Y-%m-%d'),
                "reason": f"Test leave request by {role}"
            }
            
            success, new_leave = self.run_test(
                f"Create leave as {role}",
                "POST",
                "hr/leaves",
                200,
                data=leave_data,
                token=token
            )
            
            # Test leave approval (only for authorized roles)
            if success and new_leave.get('id') and role in ['super_admin', 'main_handler', 'admin']:
                self.run_test(
                    f"Approve leave as {role}",
                    "PUT",
                    f"hr/leaves/{new_leave['id']}",
                    200,
                    data={"status": "approved"},
                    token=token
                )

    def test_finance_module(self):
        """Test Finance endpoints"""
        print("\n💰 Testing Finance Module...")
        
        for role, token in self.tokens.items():
            # Get invoices
            self.run_test(
                f"Get invoices for {role}",
                "GET",
                "finance/invoices",
                200,
                token=token
            )
            
            # Get expenses
            self.run_test(
                f"Get expenses for {role}",
                "GET",
                "finance/expenses",
                200,
                token=token
            )
            
            # Create expense (all roles)
            expense_data = {
                "title": f"Test Expense {datetime.now().strftime('%H%M%S')}",
                "amount": 150.00,
                "category": "software"
            }
            
            self.run_test(
                f"Create expense as {role}",
                "POST",
                "finance/expenses",
                200,
                data=expense_data,
                token=token
            )
            
            # Create invoice (only authorized roles)
            if role in ['super_admin', 'main_handler', 'admin']:
                invoice_data = {
                    "client_name": f"Test Client {datetime.now().strftime('%H%M%S')}",
                    "client_email": "testclient@example.com",
                    "items": [
                        {"description": "Consulting Services", "quantity": 10, "rate": 150.00}
                    ],
                    "due_date": (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
                }
                
                self.run_test(
                    f"Create invoice as {role}",
                    "POST",
                    "finance/invoices",
                    200,
                    data=invoice_data,
                    token=token
                )

    def test_notifications_module(self):
        """Test Notifications endpoints"""
        print("\n🔔 Testing Notifications Module...")
        
        for role, token in self.tokens.items():
            # Get notifications
            success, notifications = self.run_test(
                f"Get notifications for {role}",
                "GET",
                "notifications",
                200,
                token=token
            )
            
            if success and notifications and len(notifications) > 0:
                # Mark first notification as read
                notif_id = notifications[0]['id']
                self.run_test(
                    f"Mark notification read as {role}",
                    "PUT",
                    f"notifications/{notif_id}/read",
                    200,
                    token=token
                )
                
                # Mark all as read
                self.run_test(
                    f"Mark all notifications read as {role}",
                    "PUT",
                    "notifications/read-all",
                    200,
                    token=token
                )

    def test_subscription_module(self):
        """Test Subscription endpoints"""
        print("\n💳 Testing Subscription Module...")
        
        # Get plans (no auth required)
        self.run_test(
            "Get subscription plans",
            "GET",
            "subscriptions/plans",
            200
        )

    def test_admin_modules(self):
        """Test Admin-only endpoints"""
        print("\n🛡️ Testing Admin Modules...")
        
        # Test audit logs (only super_admin and main_handler)
        for role, token in self.tokens.items():
            expected_status = 200 if role in ['super_admin', 'main_handler'] else 403
            self.run_test(
                f"Get audit logs as {role}",
                "GET",
                "audit-logs",
                expected_status,
                token=token
            )
        
        # Test user management (only super_admin and main_handler)
        for role, token in self.tokens.items():
            expected_status = 200 if role in ['super_admin', 'main_handler'] else 403
            success, users_data = self.run_test(
                f"Get users as {role}",
                "GET",
                "users",
                expected_status,
                token=token
            )
            
            # Test role update (only super_admin)
            if role == 'super_admin' and success and users_data:
                # Find an employee to update role
                employee_user = next((u for u in users_data if u.get('role') == 'employee'), None)
                if employee_user:
                    self.run_test(
                        f"Update user role as {role}",
                        "PUT",
                        f"users/{employee_user['id']}/role",
                        200,
                        data={"role": "admin"},
                        token=token
                    )
                    
                    # Revert back
                    self.run_test(
                        f"Revert user role as {role}",
                        "PUT",
                        f"users/{employee_user['id']}/role",
                        200,
                        data={"role": "employee"},
                        token=token
                    )

    def test_auth_edge_cases(self):
        """Test authentication edge cases"""
        print("\n🔒 Testing Auth Edge Cases...")
        
        # Test invalid credentials
        self.run_test(
            "Invalid login credentials",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@example.com", "password": "wrongpassword"}
        )
        
        # Test protected endpoint without token
        self.run_test(
            "Access protected endpoint without token",
            "GET",
            "dashboard/stats",
            401
        )
        
        # Test with invalid token
        self.run_test(
            "Access with invalid token",
            "GET",
            "dashboard/stats",
            401,
            token="invalid-token"
        )

    def run_all_tests(self):
        """Run all test suites"""
        start_time = datetime.now()
        print("🚀 Starting Enterprise API Tests...")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_authentication()
            self.test_dashboard_stats()
            self.test_crm_module()
            self.test_projects_module()
            self.test_hr_module()
            self.test_finance_module()
            self.test_notifications_module()
            self.test_subscription_module()
            self.test_admin_modules()
            self.test_auth_edge_cases()
            
        except Exception as e:
            print(f"\n❌ Test suite failed with exception: {e}")
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"\n📊 Test Results Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        print(f"Duration: {duration:.2f}s")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for i, failed in enumerate(self.failed_tests[:10], 1):  # Show first 10 failures
                print(f"  {i}. {failed['test']}: {failed['error']}")
            if len(self.failed_tests) > 10:
                print(f"  ... and {len(self.failed_tests) - 10} more")
        
        return self.tests_passed == self.tests_run

def main():
    tester = EnterpriseAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())