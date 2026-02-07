import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Globe, Search, Check, ArrowRight, ArrowLeft, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [domainSearch, setDomainSearch] = useState('');
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [purchasedDomain, setPurchasedDomain] = useState(null);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });

  const searchDomains = async () => {
    if (!domainSearch.trim()) { toast.error('Enter a domain name'); return; }
    setSearching(true);
    try {
      const res = await api.post('/domains/check', { domain: domainSearch });
      setDomains(res.data);
    } catch (err) { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const purchaseDomain = async () => {
    if (!selectedDomain) return;
    setPurchasing(true);
    try {
      const email = `admin@${selectedDomain.domain}`;
      const res = await api.post('/domains/purchase', { domain: selectedDomain.domain, email });
      setPurchasedDomain(res.data);
      setForm(prev => ({ ...prev, email: email, company: domainSearch }));
      toast.success(`Domain ${selectedDomain.domain} purchased!`);
      setStep(2);
    } catch (err) { toast.error(err.response?.data?.detail || 'Purchase failed'); }
    finally { setPurchasing(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('All fields required'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setRegistering(true);
    try {
      const res = await api.post('/auth/register', { ...form, domain: purchasedDomain?.domain || '' });
      localStorage.setItem('token', res.data.token);
      toast.success('Account created! Welcome to Enterprise One.');
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) { toast.error(err.response?.data?.detail || 'Registration failed'); }
    finally { setRegistering(false); }
  };

  return (
    <div className="min-h-screen flex" data-testid="register-page">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden sidebar-gradient">
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.unsplash.com/photo-1761979089822-0b058236d195?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBjb3Jwb3JhdGUlMjBvZmZpY2UlMjBhcmNoaXRlY3R1cmUlMjBhYnN0cmFjdCUyMG1pbmltYWx8ZW58MHx8fHwxNzcwNDY3MjkyfDA&ixlib=rb-4.1.0&q=85" alt="Corporate" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Enterprise One</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }}>
              Get Your<br />Business Domain
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              Purchase a custom domain, set up your company email, and access the full enterprise workspace.
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">Custom Domain</Badge>
            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">Business Email</Badge>
            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">Full Access</Badge>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-[hsl(221,83%,53%)]" />
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Enterprise One</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-[hsl(221,83%,53%)] text-white' : 'bg-muted text-muted-foreground'}`}>1</div>
            <div className={`flex-1 h-0.5 ${step >= 2 ? 'bg-[hsl(221,83%,53%)]' : 'bg-muted'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-[hsl(221,83%,53%)] text-white' : 'bg-muted text-muted-foreground'}`}>2</div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Choose Your Domain</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Search for your perfect business domain</p>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="e.g., mycompany" className="pl-9 h-11" value={domainSearch}
                      onChange={e => setDomainSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchDomains()}
                      data-testid="domain-search-input" />
                  </div>
                  <Button onClick={searchDomains} disabled={searching} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white h-11" data-testid="domain-search-btn">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {domains.length > 0 && (
                  <div className="space-y-2" data-testid="domain-results">
                    {domains.map(d => (
                      <Card key={d.domain}
                        className={`border cursor-pointer transition-all duration-200 ${selectedDomain?.domain === d.domain ? 'border-[hsl(221,83%,53%)] bg-blue-50/30 shadow-sm' : 'hover:border-primary/30'} ${!d.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => d.available && setSelectedDomain(d)}
                        data-testid={`domain-option-${d.domain}`}
                      >
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            {selectedDomain?.domain === d.domain && <Check className="w-4 h-4 text-[hsl(221,83%,53%)]" />}
                            <span className="font-medium text-sm">{d.domain}</span>
                            {!d.available && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600">Taken</Badge>}
                          </div>
                          <div className="text-right">
                            {d.available ? (
                              <span className="text-sm font-bold font-mono" style={{ fontFamily: 'JetBrains Mono' }}>${d.price.toFixed(2)}<span className="text-xs text-muted-foreground font-normal">/yr</span></span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Unavailable</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedDomain && (
                  <Button onClick={purchaseDomain} disabled={purchasing} className="w-full h-11 bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="purchase-domain-btn">
                    {purchasing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                    Purchase {selectedDomain.domain} — ${selectedDomain.price.toFixed(2)}/yr
                  </Button>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="back-to-domain">
                  <ArrowLeft className="w-3 h-3" /> Back to domain
                </button>

                <div>
                  <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Create Account</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Set up your workspace with {purchasedDomain?.domain}</p>
                </div>

                {purchasedDomain && (
                  <Card className="border-[hsl(221,83%,53%)] border bg-blue-50/30">
                    <CardContent className="flex items-center gap-3 p-3">
                      <Check className="w-5 h-5 text-[hsl(175,77%,26%)]" />
                      <div>
                        <p className="text-sm font-medium">{purchasedDomain.domain} purchased</p>
                        <p className="text-xs text-muted-foreground">Your business email: admin@{purchasedDomain.domain}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="h-11" data-testid="reg-name-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="My Company" className="h-11" data-testid="reg-company-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@domain.com" className="h-11" data-testid="reg-email-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="h-11 pr-10" data-testid="reg-password-input" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" disabled={registering} data-testid="register-submit-btn">
                    {registering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                    Create Account <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-[hsl(221,83%,53%)] hover:underline font-medium" data-testid="go-to-login">
                Sign In
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
