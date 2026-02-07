import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Users, Briefcase, FolderKanban, Receipt, TrendingUp, Clock, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const STAT_CARDS = [
  { key: 'leads', label: 'Active Leads', icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
  { key: 'deals', label: 'Open Deals', icon: TrendingUp, color: 'text-teal-600 bg-teal-50' },
  { key: 'tasks', label: 'Total Tasks', icon: FolderKanban, color: 'text-amber-600 bg-amber-50' },
  { key: 'employees', label: 'Team Members', icon: Users, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'pending_leaves', label: 'Pending Leaves', icon: Clock, color: 'text-orange-600 bg-orange-50' },
  { key: 'invoices', label: 'Invoices', icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'total_revenue', label: 'Revenue', icon: Receipt, color: 'text-green-600 bg-green-50', format: 'currency' },
  { key: 'pending_expenses', label: 'Pending Expenses', icon: AlertCircle, color: 'text-rose-600 bg-rose-50' },
];

const PIE_COLORS = ['hsl(221,83%,53%)', 'hsl(175,77%,26%)', 'hsl(17,88%,40%)', 'hsl(43,74%,66%)'];

const ROLE_ACCESS = {
  super_admin: { label: 'God Mode', desc: 'Full access to all modules and admin controls' },
  main_handler: { label: 'Operations', desc: 'Access to all modules and audit logs' },
  admin: { label: 'Department Admin', desc: 'CRM, Projects, HR, and Finance management' },
  employee: { label: 'Team Member', desc: 'View projects, submit leaves and expenses' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const barData = [
    { name: 'Leads', value: stats.leads || 0 },
    { name: 'Deals', value: stats.deals || 0 },
    { name: 'Tasks', value: stats.tasks || 0 },
    { name: 'Invoices', value: stats.invoices || 0 },
  ];

  const pieData = [
    { name: 'Revenue', value: stats.total_revenue || 0 },
    { name: 'Pending', value: (stats.pending_expenses || 0) * 100 },
    { name: 'Leads Value', value: (stats.leads || 0) * 1000 },
    { name: 'Deals', value: (stats.deals || 0) * 5000 },
  ].filter(d => d.value > 0);

  const access = ROLE_ACCESS[user?.role] || ROLE_ACCESS.employee;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="dashboard-page">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }} data-testid="dashboard-welcome">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {access.label} — {access.desc}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {user?.subscription?.charAt(0).toUpperCase() + user?.subscription?.slice(1)} Plan
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="stats-grid">
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card className="stat-card border shadow-sm hover:border-primary/30 transition-all duration-200 cursor-default" data-testid={`stat-${card.key}`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold tracking-tight font-mono" style={{ fontFamily: 'JetBrains Mono' }}>
                    {loading ? '—' : card.format === 'currency' ? `$${(stats[card.key] || 0).toLocaleString()}` : stats[card.key] || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-sm" data-testid="bar-chart-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold" style={{ fontFamily: 'Manrope' }}>Module Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 32%, 91%)', fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(221,83%,53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm" data-testid="pie-chart-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold" style={{ fontFamily: 'Manrope' }}>Financial Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 32%, 91%)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-16">No financial data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card className="border shadow-sm" data-testid="quick-access-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold" style={{ fontFamily: 'Manrope' }}>Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'CRM', path: '/crm', icon: Briefcase, color: 'bg-blue-500', roles: ['super_admin', 'main_handler', 'admin'] },
              { label: 'Projects', path: '/projects', icon: FolderKanban, color: 'bg-teal-500', roles: ['super_admin', 'main_handler', 'admin', 'employee'] },
              { label: 'HR', path: '/hr', icon: Users, color: 'bg-amber-500', roles: ['super_admin', 'main_handler', 'admin', 'employee'] },
              { label: 'Finance', path: '/finance', icon: Receipt, color: 'bg-emerald-500', roles: ['super_admin', 'main_handler', 'admin', 'employee'] },
            ].filter(q => q.roles.includes(user?.role)).map(q => (
              <button
                key={q.path}
                onClick={() => navigate(q.path)}
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors duration-200 text-left"
                data-testid={`quick-${q.label.toLowerCase()}`}
              >
                <div className={`w-9 h-9 rounded-md ${q.color} flex items-center justify-center`}>
                  <q.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium">{q.label}</p>
                  <p className="text-xs text-muted-foreground">Open module</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
