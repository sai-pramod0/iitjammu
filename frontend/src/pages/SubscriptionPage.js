import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

const PLAN_FEATURES = {
  free: { icon: '1', color: 'border-slate-200', btnClass: 'bg-secondary text-secondary-foreground hover:bg-secondary/80' },
  professional: { icon: '2', color: 'border-[hsl(221,83%,53%)]', btnClass: 'bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white' },
  enterprise: { icon: '3', color: 'border-primary', btnClass: 'bg-primary hover:bg-primary/90 text-primary-foreground' },
};

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    api.get('/subscriptions/plans').then(r => setPlans(r.data)).catch(() => {});
  }, []);

  const pollStatus = useCallback(async (sessionId, attempts = 0) => {
    if (attempts >= 5) { setCheckingPayment(false); toast.error('Payment status check timed out'); return; }
    try {
      const res = await api.get(`/subscriptions/status/${sessionId}`);
      if (res.data.payment_status === 'paid') {
        setCheckingPayment(false);
        toast.success('Subscription activated!');
        await refreshUser();
        return;
      }
      if (res.data.status === 'expired') { setCheckingPayment(false); toast.error('Session expired'); return; }
      setTimeout(() => pollStatus(sessionId, attempts + 1), 2000);
    } catch { setCheckingPayment(false); toast.error('Failed to check status'); }
  }, [refreshUser]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      setCheckingPayment(true);
      pollStatus(sessionId);
    }
  }, [searchParams, pollStatus]);

  const checkout = async (planId) => {
    setLoading(planId);
    try {
      const res = await api.post('/subscriptions/checkout', { plan_id: planId, origin_url: window.location.origin });
      if (res.data.url) window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Checkout failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="subscription-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Subscription</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose the plan that works for your team</p>
      </div>

      {checkingPayment && (
        <Card className="border-[hsl(221,83%,53%)] bg-blue-50 border" data-testid="payment-checking">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(221,83%,53%)]" />
            <p className="text-sm font-medium">Verifying your payment...</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="plans-grid">
        {Object.entries(plans).map(([id, plan], i) => {
          const config = PLAN_FEATURES[id] || PLAN_FEATURES.free;
          const isCurrent = user?.subscription === id;
          return (
            <motion.div key={id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`border-2 ${isCurrent ? config.color : 'border-border'} shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md`} data-testid={`plan-card-${id}`}>
                {isCurrent && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-md bg-[hsl(221,83%,53%)] text-white text-[10px]">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-bold font-mono" style={{ fontFamily: 'JetBrains Mono' }}>${plan.price.toFixed(2)}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features?.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-[hsl(175,77%,26%)]" strokeWidth={2} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {id === 'free' ? (
                    <Button variant="outline" className="w-full" disabled data-testid={`plan-btn-${id}`}>
                      {isCurrent ? 'Active' : 'Free Tier'}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${config.btnClass}`}
                      onClick={() => checkout(id)}
                      disabled={isCurrent || loading === id}
                      data-testid={`plan-btn-${id}`}
                    >
                      {loading === id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                      {isCurrent ? 'Active' : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
