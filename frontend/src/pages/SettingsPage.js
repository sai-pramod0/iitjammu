import { useState, useEffect } from 'react';
import { useAuth, api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Building2, Save, Loader2, Globe, LayoutTemplate, Fingerprint, CreditCard, Plus, Trash2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export default function SettingsPage() {
    const { user, login } = useAuth(); // login used to refresh user state if needed, or we might need a refreshUser function
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        company_name: user?.company_name || user?.company || '',
        company_description: user?.company_description || '',
        industry: user?.industry || '',
        website: user?.website || '',
        logo_url: user?.logo_url || ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                company_name: user.company_name || user.company || '',
                company_description: user.company_description || '',
                industry: user.industry || '',
                website: user.website || '',
                logo_url: user.logo_url || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const registerBiometric = async (type) => {
        try {
            await api.post('/auth/biometric/register', {
                credential_id: `simulated-${type}-key-${Date.now()}`,
                biometric_type: type
            });
            toast.success(`${type === 'face' ? 'Face ID' : 'Touch ID'} enabled successfully`);
        } catch (err) { toast.error('Failed to enable biometrics'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/auth/company', formData);
            toast.success('Company profile updated successfully');
            // Ideally we should reload user data here.
            // For this MVP, we can just rely on the next page load or implement a token refresh if critical.
            window.location.reload();
        } catch (err) {
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[800px] mx-auto space-y-8 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
                    <Building2 className="w-8 h-8 text-slate-600" /> Startup Settings
                </h1>
                <p className="text-muted-foreground mt-1">Manage your company profile and workspace details.</p>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                    <CardHeader>
                        <CardTitle>Company Profile</CardTitle>
                        <CardDescription>These details will be used in your Pitch Deck and public profile.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="company_name">Company Name</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input id="company_name" name="company_name" value={formData.company_name} onChange={handleChange} className="pl-9" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="industry">Industry</Label>
                                    <div className="relative">
                                        <LayoutTemplate className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input id="industry" name="industry" value={formData.industry} onChange={handleChange} className="pl-9" placeholder="e.g. Fintech, SaaS" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input id="website" name="website" value={formData.website} onChange={handleChange} className="pl-9" placeholder="https://..." />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="logo_url">Logo URL</Label>
                                <Input id="logo_url" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://..." />
                                {formData.logo_url && (
                                    <div className="mt-2 p-2 border rounded-md w-16 h-16 flex items-center justify-center bg-gray-50">
                                        <img src={formData.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company_description">Company Description</Label>
                                <Textarea
                                    id="company_description"
                                    name="company_description"
                                    value={formData.company_description}
                                    onChange={handleChange}
                                    placeholder="Describe your startup in 2-3 sentences..."
                                    className="h-32"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company_description">Company Description</Label>
                                <Textarea
                                    id="company_description"
                                    name="company_description"
                                    value={formData.company_description}
                                    onChange={handleChange}
                                    placeholder="Describe your startup in 2-3 sentences..."
                                    className="h-32"
                                />
                            </div>

                            <div className="pt-4 border-t space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Security & Authentication</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium flex items-center gap-2"><Fingerprint className="w-4 h-4" /> Biometric Authentication</div>
                                                    <div className="text-sm text-muted-foreground">Secure your account with Face ID or Fingerprint</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => registerBiometric('fingerprint')}>
                                                    <Fingerprint className="w-4 h-4 mr-2" /> Touch ID
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => registerBiometric('face')}>
                                                    <div className="w-4 h-4 mr-2 border-2 border-current rounded-sm" /> Face ID
                                                </Button>
                                            </div>
                                        </div>

                                        <PasswordChange />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
                                    <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                                        <PaymentMethods />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

const PaymentMethods = () => {
    const [methods, setMethods] = useState([]);
    const [adding, setAdding] = useState(false);
    const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });

    useEffect(() => {
        api.get('/auth/payment/methods').then(r => setMethods(r.data)).catch(() => { });
    }, []);

    const addCard = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/payment/add', {
                card_number: card.number,
                expiry: card.expiry,
                cvc: card.cvc,
                cardholder_name: card.name
            });
            setMethods([...methods, res.data]);
            setAdding(false);
            setCard({ number: '', expiry: '', cvc: '', name: '' });
            toast.success('Card added successfully');
        } catch (err) { toast.error('Failed to add card'); }
    };

    return (
        <div className="space-y-4">
            {methods.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-slate-500" />
                        <div>
                            <p className="font-medium text-sm">{m.card_number}</p>
                            <p className="text-xs text-muted-foreground">Expires {m.expiry} • {m.cardholder_name}</p>
                        </div>
                    </div>
                </div>
            ))}

            {adding ? (
                <form onSubmit={addCard} className="space-y-3 bg-white p-4 rounded border">
                    <Input placeholder="Cardholder Name" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} required />
                    <Input placeholder="Card Number" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} required />
                    <div className="flex gap-3">
                        <Input placeholder="MM/YY" value={card.expiry} onChange={e => setCard({ ...card, expiry: e.target.value })} required className="w-1/2" />
                        <Input placeholder="CVC" value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value })} required className="w-1/2" />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                        <Button type="submit" size="sm">Save Card</Button>
                    </div>
                </form>
            ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Payment Method
                </Button>
            )}
        </div>
    );
};

const PasswordChange = () => {
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [changing, setChanging] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) { toast.error("New passwords don't match"); return; }
        setChanging(true);
        try {
            await api.put('/auth/password', {
                current_password: passwords.current,
                new_password: passwords.new
            });
            toast.success('Password changed successfully');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to change password'); }
        finally { setChanging(false); }
    };

    return (
        <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
            <div>
                <div className="font-medium flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</div>
                <div className="text-sm text-muted-foreground">Update your login password</div>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
                <Input type="password" placeholder="Current Password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} required className="bg-white" />
                <Input type="password" placeholder="New Password" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} required minLength={6} className="bg-white" />
                <Input type="password" placeholder="Confirm New Password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} required minLength={6} className="bg-white" />
                <Button type="submit" size="sm" disabled={changing} className="w-full">
                    {changing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Update Password'}
                </Button>
            </form>
        </div>
    );
};
