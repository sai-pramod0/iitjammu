import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Fingerprint, Shield, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

const DEMO_ACCOUNTS = [
  { email: 'superadmin@enterprise.com', password: 'SuperAdmin123', role: 'Super Admin', color: 'bg-red-100 text-red-800 border-red-200' },
  { email: 'handler@enterprise.com', password: 'Handler123', role: 'Main Handler', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { email: 'admin@enterprise.com', password: 'Admin123', role: 'Admin', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { email: 'employee@enterprise.com', password: 'Employee123', role: 'Employee', color: 'bg-green-100 text-green-800 border-green-200' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) { toast.error('Please enter email and password'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setLoading(true);
    try {
      await login(account.email, account.password);
      toast.success(`Signed in as ${account.role}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setBiometricScanning(true);
    try {
      if (window.PublicKeyCredential) {
        toast.info('Biometric authentication requires registration first. Use password login.');
      } else {
        toast.info('Biometric not supported in this browser. Use password login.');
      }
    } finally {
      setTimeout(() => setBiometricScanning(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left panel - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden sidebar-gradient">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1761979089822-0b058236d195?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBjb3Jwb3JhdGUlMjBvZmZpY2UlMjBhcmNoaXRlY3R1cmUlMjBhYnN0cmFjdCUyMG1pbmltYWx8ZW58MHx8fHwxNzcwNDY3MjkyfDA&ixlib=rb-4.1.0&q=85"
            alt="Corporate" className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Enterprise One</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }}>
              Secure Workspace<br />for Modern Teams
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              Biometric-authorized access with role-based controls. CRM, Projects, HR, and Finance - unified in one platform.
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">WebAuthn</Badge>
            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">RBAC</Badge>
            <Badge variant="outline" className="border-white/20 text-white/60 text-xs">Enterprise</Badge>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Shield className="w-6 h-6 text-[hsl(221,83%,53%)]" />
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Enterprise One</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Welcome back</h2>
            <p className="text-muted-foreground mt-1 text-sm">Sign in to access your workspace</p>
          </div>

          {/* Biometric Button */}
          <div className="flex justify-center">
            <button
              onClick={handleBiometric}
              className="relative group"
              data-testid="biometric-login-btn"
              disabled={biometricScanning}
            >
              <div className={`w-20 h-20 rounded-full border-2 ${biometricScanning ? 'border-[hsl(221,83%,53%)]' : 'border-border'} flex items-center justify-center transition-all duration-300 group-hover:border-[hsl(221,83%,53%)] group-hover:shadow-lg`}>
                {biometricScanning && <div className="absolute inset-0 rounded-full border-2 border-[hsl(221,83%,53%)] animate-pulse-ring" />}
                <Fingerprint className={`w-8 h-8 ${biometricScanning ? 'text-[hsl(221,83%,53%)]' : 'text-muted-foreground'} transition-colors duration-300 group-hover:text-[hsl(221,83%,53%)]`} strokeWidth={1.5} />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">Touch to authenticate</p>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground">or continue with password</span></div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@enterprise.com" value={email} onChange={e => setEmail(e.target.value)}
                data-testid="login-email-input" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={password}
                  onChange={e => setPassword(e.target.value)} data-testid="login-password-input" className="h-11 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="toggle-password">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" disabled={loading} data-testid="login-submit-btn">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center uppercase tracking-wider">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  onClick={() => handleDemoLogin(acc)}
                  className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted transition-colors duration-200 text-left"
                  data-testid={`demo-${acc.role.toLowerCase().replace(' ', '-')}`}
                  disabled={loading}
                >
                  <Badge variant="outline" className={`text-[10px] ${acc.color} whitespace-nowrap`}>{acc.role}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              New here?{' '}
              <button onClick={() => navigate('/register')} className="text-[hsl(221,83%,53%)] hover:underline font-medium" data-testid="go-to-register">
                Register with domain
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
