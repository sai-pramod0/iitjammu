# Enterprise One - PRD

## Problem Statement
Build a secure, enterprise-grade web application featuring biometric authentication (WebAuthn), RBAC, and distinct dashboards for Super Admins, Main Handlers, Admins, and Employees. "Zoho-like" workspace with CRM, Projects, HR, Finance modules. Subscription-based services with Stripe payment portal and mock email notifications.

## Architecture
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Frontend**: React + Shadcn/UI + Tailwind CSS + Framer Motion + Recharts
- **Auth**: JWT (bcrypt hashing) + WebAuthn biometric support
- **Payments**: Stripe via emergentintegrations library
- **Notifications**: Mock email stored in MongoDB

## User Personas
1. **Super Admin** (Marcus Chen) - God mode, all modules + user management
2. **Main Handler** (Sarah Rodriguez) - All modules + audit logs
3. **Admin** (James Wilson) - CRM, Projects, HR, Finance management
4. **Employee** (Emily Park) - Limited access, own tasks/leaves/expenses

## Core Requirements
- Biometric + password authentication
- Role-Based Access Control (4 roles)
- CRM Module (Leads, Deals pipeline)
- Projects Module (Kanban board)
- HR Module (Directory, Leave requests)
- Finance Module (Invoices, Expenses)
- Subscription Plans (Free, Pro, Enterprise) with Stripe checkout
- Mock email notifications
- Audit logging
- User management

## What's Been Implemented (Feb 7, 2026)
- Full backend with 25+ API endpoints (CRUD for all modules)
- JWT authentication with pre-seeded demo users
- WebAuthn biometric UI with password fallback
- Role-based route protection (frontend + backend)
- Dashboard with stats, charts (Recharts)
- CRM: Leads table, deals pipeline view
- Projects: Kanban board with task movement
- HR: Employee directory, leave management
- Finance: Invoices, expense tracking
- Subscription page with Stripe checkout integration
- Notifications center (mock email)
- Audit logs viewer
- User management with role switching
- Waffle menu for module switching
- Design system: Manrope/Public Sans fonts, Deep Indigo/Signal Blue palette

## Testing Results
- Backend: 100% (96/96 tests)
- Frontend: 95% (minor overlay issues fixed)

## Prioritized Backlog
### P0 (Done)
- All core modules, auth, RBAC, navigation

### P1
- Full WebAuthn credential storage/verification
- Invoice status updates (mark as sent/paid)
- Expense approval/rejection flow
- Search/filter across all modules

### P2
- Dark mode toggle
- Real email integration (SendGrid/Resend)
- Export data (CSV/PDF)
- Dashboard customization per role
- Mobile responsive sidebar (sheet drawer)
