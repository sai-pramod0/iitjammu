import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Fingerprint, Shield, Check, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';

export default function BiometricSetupPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [setupComplete, setSetupComplete] = useState(false);

    const handleSetup = async (type) => {
        setLoading(true);
        try {
            // Simulate biometric registration
            await new Promise(resolve => setTimeout(resolve, 1500));

            await api.post('/auth/biometric/register', {
                credential_id: `forced-bio-${Date.now()}`,
                biometric_type: type
            });

            setSetupComplete(true);
            toast.success(`${type === 'face' ? 'Face ID' : 'Touch ID'} setup complete!`);

            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (err) {
            toast.error('Failed to set up biometrics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                <Card className="border-t-4 border-t-blue-600 shadow-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Security Setup Required</CardTitle>
                        <CardDescription>
                            Your organization requires Biometric Authentication for all employees.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {!setupComplete ? (
                            <>
                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        className="w-full h-14 justify-between px-6 hover:border-blue-500 hover:bg-blue-50 group"
                                        onClick={() => handleSetup('fingerprint')}
                                        disabled={loading}
                                    >
                                        <span className="flex items-center gap-3 font-medium">
                                            <Fingerprint className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
                                            Set up Touch ID
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full h-14 justify-between px-6 hover:border-blue-500 hover:bg-blue-50 group"
                                        onClick={() => handleSetup('face')}
                                        disabled={loading}
                                    >
                                        <span className="flex items-center gap-3 font-medium">
                                            <div className="w-5 h-5 border-2 border-slate-500 rounded-sm group-hover:border-blue-600" />
                                            Set up Face ID
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                    </Button>
                                </div>
                                <p className="text-xs text-center text-muted-foreground bg-slate-100 p-3 rounded">
                                    This step is mandatory. You cannot access the dashboard without securing your account.
                                </p>
                            </>
                        ) : (
                            <div className="text-center py-6 space-y-4">
                                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-lg font-medium text-green-700">All Set!</h3>
                                <p className="text-sm text-muted-foreground">Redirecting to your workspace...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
