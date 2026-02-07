import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Brain, TrendingDown, DollarSign, Users, Target, Activity, Loader2, Sparkles, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['hsl(221,83%,53%)', 'hsl(175,77%,26%)', 'hsl(17,88%,40%)', 'hsl(43,74%,66%)', 'hsl(280,65%,60%)'];

function MetricCard({ label, value, icon: Icon, color, prefix = '', suffix = '' }) {
  return (
    <Card className="border shadow-sm hover:border-primary/30 transition-all duration-200">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'JetBrains Mono' }}>
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AIAnalysisCard({ analysis, loading }) {
  return (
    <Card className="border shadow-sm border-l-2 border-l-[hsl(221,83%,53%)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
          <Sparkles className="w-4 h-4 text-[hsl(221,83%,53%)]" /> AI Analysis
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">GPT-5.2</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(221,83%,53%)]" />
            <p className="text-sm text-muted-foreground">AI agent analyzing your data...</p>
          </div>
        ) : analysis ? (
          <div className="prose prose-sm max-w-none">
            {analysis.split('\n').map((line, i) => (
              <p key={i} className={`text-sm leading-relaxed ${line.startsWith('-') || line.startsWith('*') || line.startsWith('•') ? 'pl-4 text-muted-foreground' : ''} ${line.match(/^(#+|\d+[\.\)])/) ? 'font-semibold text-foreground mt-3' : 'text-muted-foreground'}`}>
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Click "Run AI Analysis" to get insights</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [burnData, setBurnData] = useState(null);
  const [unitData, setUnitData] = useState(null);
  const [prodData, setProdData] = useState(null);
  const [burnLoading, setBurnLoading] = useState(false);
  const [unitLoading, setUnitLoading] = useState(false);
  const [prodLoading, setProdLoading] = useState(false);

  const runBurnRate = async () => {
    setBurnLoading(true);
    try {
      const res = await api.post('/analytics/burn-rate');
      setBurnData(res.data);
      toast.success('Burn rate analysis complete');
    } catch (err) { toast.error(err.response?.data?.detail || 'Analysis failed'); }
    finally { setBurnLoading(false); }
  };

  const runUnitEcon = async () => {
    setUnitLoading(true);
    try {
      const res = await api.post('/analytics/unit-economics');
      setUnitData(res.data);
      toast.success('Unit economics analysis complete');
    } catch (err) { toast.error(err.response?.data?.detail || 'Analysis failed'); }
    finally { setUnitLoading(false); }
  };

  const runProductOpt = async () => {
    setProdLoading(true);
    try {
      const res = await api.post('/analytics/product-optimization');
      setProdData(res.data);
      toast.success('Product optimization analysis complete');
    } catch (err) { toast.error(err.response?.data?.detail || 'Analysis failed'); }
    finally { setProdLoading(false); }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="analytics-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>AI Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered insights for burn rate, unit economics, and product optimization</p>
        </div>
        <Badge className="bg-[hsl(221,83%,53%)] text-white">
          <Brain className="w-3 h-3 mr-1" /> Powered by GPT-5.2
        </Badge>
      </div>

      <Tabs defaultValue="burn-rate">
        <TabsList data-testid="analytics-tabs">
          <TabsTrigger value="burn-rate" data-testid="tab-burn-rate">
            <TrendingDown className="w-4 h-4 mr-2" /> Burn Rate
          </TabsTrigger>
          <TabsTrigger value="unit-economics" data-testid="tab-unit-economics">
            <DollarSign className="w-4 h-4 mr-2" /> Unit Economics
          </TabsTrigger>
          <TabsTrigger value="product-optimization" data-testid="tab-product-optimization">
            <Activity className="w-4 h-4 mr-2" /> Product Optimization
          </TabsTrigger>
        </TabsList>

        {/* BURN RATE TAB */}
        <TabsContent value="burn-rate" className="space-y-6 mt-4">
          <div className="flex justify-end">
            <Button onClick={runBurnRate} disabled={burnLoading} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="run-burn-analysis">
              {burnLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
              Run AI Analysis
            </Button>
          </div>

          {burnData && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="burn-metrics">
                <MetricCard label="Total Expenses" value={burnData.metrics.total_expenses} icon={TrendingDown} color="text-red-600 bg-red-50" prefix="$" />
                <MetricCard label="Total Revenue" value={burnData.metrics.total_revenue} icon={DollarSign} color="text-green-600 bg-green-50" prefix="$" />
                <MetricCard label="Net Burn" value={burnData.metrics.net_burn} icon={TrendingDown} color="text-amber-600 bg-amber-50" prefix="$" suffix="/mo" />
                <MetricCard label="Runway" value={burnData.metrics.runway_months > 98 ? 'Profitable' : `${burnData.metrics.runway_months}`} icon={Target} color="text-blue-600 bg-blue-50" suffix={burnData.metrics.runway_months <= 98 ? ' mo' : ''} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <Card className="border shadow-sm" data-testid="expense-breakdown-chart">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Manrope' }}><PieChartIcon className="w-4 h-4" /> Expense Breakdown</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={burnData.metrics.expense_breakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="amount" nameKey="category">
                            {burnData.metrics.expense_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <RTooltip formatter={(v) => `$${v}`} contentStyle={{ borderRadius: 8, border: '1px solid hsl(214,32%,91%)', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="border shadow-sm" data-testid="revenue-expense-chart">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'Manrope' }}><BarChart3 className="w-4 h-4" /> Revenue vs Expenses</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={burnData.metrics.revenue_vs_expense}>
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                          <RTooltip formatter={(v) => `$${v}`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {burnData.metrics.revenue_vs_expense.map((_, i) => <Cell key={i} fill={i === 0 ? 'hsl(175,77%,26%)' : 'hsl(17,88%,40%)'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <AIAnalysisCard analysis={burnData.ai_analysis} loading={burnLoading} />
              </div>
            </motion.div>
          )}
          {!burnData && !burnLoading && (
            <Card className="border border-dashed"><CardContent className="text-center py-16 text-muted-foreground"><TrendingDown className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Click "Run AI Analysis" to analyze your burn rate</p></CardContent></Card>
          )}
        </TabsContent>

        {/* UNIT ECONOMICS TAB */}
        <TabsContent value="unit-economics" className="space-y-6 mt-4">
          <div className="flex justify-end">
            <Button onClick={runUnitEcon} disabled={unitLoading} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="run-unit-analysis">
              {unitLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
              Run AI Analysis
            </Button>
          </div>

          {unitData && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="unit-metrics">
                <MetricCard label="CAC" value={unitData.metrics.cac} icon={Target} color="text-red-600 bg-red-50" prefix="$" />
                <MetricCard label="LTV" value={unitData.metrics.ltv} icon={DollarSign} color="text-green-600 bg-green-50" prefix="$" />
                <MetricCard label="LTV/CAC Ratio" value={unitData.metrics.ltv_cac_ratio} icon={TrendingDown} color="text-blue-600 bg-blue-50" suffix="x" />
                <MetricCard label="Payback Period" value={unitData.metrics.payback_months} icon={Target} color="text-amber-600 bg-amber-50" suffix=" mo" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard label="ARPU" value={unitData.metrics.arpu} icon={DollarSign} color="text-indigo-600 bg-indigo-50" prefix="$" />
                <MetricCard label="Gross Margin" value={unitData.metrics.gross_margin} icon={TrendingDown} color="text-teal-600 bg-teal-50" suffix="%" />
                <MetricCard label="Rev / Employee" value={unitData.metrics.revenue_per_employee} icon={Users} color="text-violet-600 bg-violet-50" prefix="$" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border shadow-sm" data-testid="deal-pipeline-chart">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Deal Pipeline</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={unitData.metrics.deal_stages} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                        <RTooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="value" fill="hsl(221,83%,53%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <AIAnalysisCard analysis={unitData.ai_analysis} loading={unitLoading} />
              </div>
            </motion.div>
          )}
          {!unitData && !unitLoading && (
            <Card className="border border-dashed"><CardContent className="text-center py-16 text-muted-foreground"><DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Click "Run AI Analysis" to analyze unit economics</p></CardContent></Card>
          )}
        </TabsContent>

        {/* PRODUCT OPTIMIZATION TAB */}
        <TabsContent value="product-optimization" className="space-y-6 mt-4">
          <div className="flex justify-end">
            <Button onClick={runProductOpt} disabled={prodLoading} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="run-product-analysis">
              {prodLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
              Run AI Analysis
            </Button>
          </div>

          {prodData && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="product-metrics">
                <MetricCard label="Total Actions" value={prodData.metrics.total_actions} icon={Activity} color="text-blue-600 bg-blue-50" />
                <MetricCard label="Active Users" value={prodData.metrics.active_users} icon={Users} color="text-indigo-600 bg-indigo-50" />
                <MetricCard label="Task Completion" value={prodData.metrics.task_completion_rate} icon={Target} color="text-green-600 bg-green-50" suffix="%" />
                <MetricCard label="Lead Conversion" value={prodData.metrics.lead_conversion_rate} icon={TrendingDown} color="text-amber-600 bg-amber-50" suffix="%" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <Card className="border shadow-sm" data-testid="feature-usage-chart">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Feature Usage</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={prodData.metrics.feature_usage?.slice(0, 8)}>
                          <XAxis dataKey="feature" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                          <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="count" fill="hsl(221,83%,53%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="border shadow-sm" data-testid="task-distribution-chart">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>Task Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={prodData.metrics.task_distribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="count" nameKey="status">
                            {prodData.metrics.task_distribution?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <AIAnalysisCard analysis={prodData.ai_analysis} loading={prodLoading} />
              </div>
            </motion.div>
          )}
          {!prodData && !prodLoading && (
            <Card className="border border-dashed"><CardContent className="text-center py-16 text-muted-foreground"><Activity className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Click "Run AI Analysis" to optimize your product</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
