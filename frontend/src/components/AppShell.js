import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Briefcase, FolderKanban,
  Building2, Receipt, Bell, Menu, ChevronLeft,
  LogOut, Grid3x3, Shield, FileText, CreditCard, Fingerprint
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Separator } from '../components/ui/separator';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '../components/ui/tooltip';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  main_handler: 'Main Handler',
  admin: 'Admin',
  employee: 'Employee'
};

const ROLE_COLORS = {
  super_admin: 'bg-red-100 text-red-800 border-red-200',
  main_handler: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
  employee: 'bg-green-100 text-green-800 border-green-200'
};

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'main_handler', 'admin', 'employee'] },
  { path: '/crm', label: 'CRM', icon: Briefcase, roles: ['super_admin', 'main_handler', 'admin'] },
  { path: '/projects', label: 'Projects', icon: FolderKanban, roles: ['super_admin', 'main_handler', 'admin', 'employee'] },
  { path: '/hr', label: 'HR', icon: Building2, roles: ['super_admin', 'main_handler', 'admin', 'employee'] },
  { path: '/finance', label: 'Finance', icon: Receipt, roles: ['super_admin', 'main_handler', 'admin', 'employee'] },
  { path: '/subscription', label: 'Subscription', icon: CreditCard, roles: ['super_admin', 'main_handler', 'admin', 'employee'] },
];

const ADMIN_NAV = [
  { path: '/users', label: 'Users', icon: Users, roles: ['super_admin', 'main_handler'] },
  { path: '/audit-logs', label: 'Audit Logs', icon: FileText, roles: ['super_admin', 'main_handler'] },
];

const MODULE_GRID = [
  { path: '/crm', label: 'CRM', icon: Briefcase, color: 'bg-blue-500' },
  { path: '/projects', label: 'Projects', icon: FolderKanban, color: 'bg-teal-500' },
  { path: '/hr', label: 'HR', icon: Building2, color: 'bg-amber-500' },
  { path: '/finance', label: 'Finance', icon: Receipt, color: 'bg-emerald-500' },
  { path: '/subscription', label: 'Plans', icon: CreditCard, color: 'bg-violet-500' },
  { path: '/notifications', label: 'Alerts', icon: Bell, color: 'bg-rose-500' },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [waffleOpen, setWaffleOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
  }, [location.pathname]);

  const unread = notifications.filter(n => !n.read).length;
  const filteredNav = NAV_ITEMS.filter(n => n.roles.includes(user?.role));
  const filteredAdmin = ADMIN_NAV.filter(n => n.roles.includes(user?.role));
  const initials = user?.name?.split(' ').map(n => n[0]).join('') || '?';

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-shell">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="sidebar-gradient text-white flex flex-col flex-shrink-0 overflow-hidden"
        data-testid="app-sidebar"
      >
        <div className="flex items-center h-16 px-4 gap-3">
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 flex-1 min-w-0">
              <Shield className="w-6 h-6 text-blue-400 flex-shrink-0" />
              <span className="font-semibold text-sm tracking-tight truncate" style={{ fontFamily: 'Manrope' }}>Enterprise One</span>
            </motion.div>
          )}
          {collapsed && <Shield className="w-6 h-6 text-blue-400 mx-auto" />}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-white/60 hover:text-white hover:bg-white/10 flex-shrink-0" data-testid="sidebar-toggle">
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <Separator className="bg-white/10" />

        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          <TooltipProvider delayDuration={0}>
            {filteredNav.map(item => {
              const active = location.pathname === item.path;
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200 ${active ? 'bg-white/15 text-white tracing-beam' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
                </Tooltip>
              );
            })}

            {filteredAdmin.length > 0 && (
              <>
                <Separator className="bg-white/10 my-3" />
                {!collapsed && <p className="px-3 text-[10px] uppercase tracking-wider text-white/30 mb-2">Administration</p>}
                {filteredAdmin.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(item.path)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200 ${active ? 'bg-white/15 text-white tracing-beam' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                          data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </button>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
                    </Tooltip>
                  );
                })}
              </>
            )}
          </TooltipProvider>
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2 px-2 py-1">
              <Fingerprint className="w-3 h-3 text-white/40" />
              <span className="text-[10px] text-white/40 uppercase tracking-wider">
                {user?.biometric_enabled ? 'Biometric Active' : 'Password Auth'}
              </span>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="glass-header h-16 flex items-center justify-between px-6 border-b z-10 flex-shrink-0" data-testid="app-header">
          <div className="flex items-center gap-4">
            {/* Waffle Menu */}
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setWaffleOpen(!waffleOpen)} data-testid="waffle-menu-btn" className="hover:bg-muted">
                <Grid3x3 className="w-5 h-5" strokeWidth={1.5} />
              </Button>
              <AnimatePresence>
                {waffleOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-72 bg-card border rounded-lg shadow-lg p-3 grid grid-cols-3 gap-2 z-50"
                    data-testid="waffle-menu"
                  >
                    {MODULE_GRID.map(m => (
                      <button
                        key={m.path}
                        onClick={() => { navigate(m.path); setWaffleOpen(false); }}
                        className="flex flex-col items-center gap-2 p-3 rounded-md hover:bg-muted transition-colors duration-200"
                        data-testid={`waffle-${m.label.toLowerCase()}`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${m.color} flex items-center justify-center`}>
                          <m.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Manrope' }}>
              {location.pathname.split('/')[1]?.charAt(0).toUpperCase() + location.pathname.split('/')[1]?.slice(1) || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative hover:bg-muted" onClick={() => navigate('/notifications')} data-testid="notifications-btn">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[hsl(221,83%,53%)] text-white text-[10px] rounded-full flex items-center justify-center">{unread}</span>
              )}
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:bg-muted px-2 py-1.5 rounded-md transition-colors duration-200" data-testid="user-menu-btn">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2">
                    <span>{user?.name}</span>
                    <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[user?.role]}`}>{ROLE_LABELS[user?.role]}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/subscription')} data-testid="menu-subscription">
                  <CreditCard className="w-4 h-4 mr-2" /> Subscription
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/notifications')} data-testid="menu-notifications">
                  <Bell className="w-4 h-4 mr-2" /> Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive" data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6" data-testid="main-content">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Close waffle on outside click */}
      {waffleOpen && <div className="fixed inset-0 z-40" onClick={() => setWaffleOpen(false)} />}
    </div>
  );
}
