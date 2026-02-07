import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, ArrowRight, Shield, Zap, Globe, Users, BarChart3, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
    const navigate = useNavigate();

    const services = [
        {
            title: "Enterprise ERP",
            description: "Complete business management including CRM, HR, Finance, and Project Management in one unified platform.",
            icon: Globe
        },
        {
            title: "Biometric Security",
            description: "State-of-the-art security with localized biometric authentication (Fingerprint, Face ID) for all employees.",
            icon: Shield
        },
        {
            title: "AI Analytics",
            description: "Predictive financial modeling and burn rate analysis powered by advanced AI to keep your startup healthy.",
            icon: BarChart3
        },
        {
            title: "Global Payments",
            description: "Integrated Stripe payments for seamless subscription management and automated invoicing.",
            icon: Zap
        }
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            {/* Navbar */}
            <nav className="border-b py-4 px-6 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        <Globe className="w-5 h-5" />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Enterprise One
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/login')}>Log In</Button>
                    <Button onClick={() => navigate('/register')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                        Get Started
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="py-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1 space-y-8 text-center lg:text-left">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                        New: AI Financial Analytics
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
                    >
                        Manage your entire business <br />
                        <span className="text-blue-600">in one place.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0"
                    >
                        The all-in-one platform for modern enterprises. Handle Projects, HR, Finance, and CRM with enterprise-grade security and AI insights.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                    >
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 text-lg shadow-xl shadow-blue-600/20" onClick={() => navigate('/register')}>
                            Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={() => navigate('/login')}>
                            View Demo
                        </Button>
                    </motion.div>

                    <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> No credit card required</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 14-day free trial</div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Cancel anytime</div>
                    </div>
                </div>

                <div className="flex-1 relative">
                    {/* Abstract visual representation */}
                    <div className="relative w-full aspect-square max-w-[600px] mx-auto">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                        <div className="relative z-10 grid grid-cols-2 gap-4 p-8">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Users className="w-5 h-5" /></div>
                                <div>
                                    <div className="text-2xl font-bold">1,240</div>
                                    <div className="text-sm text-muted-foreground">Active Employees</div>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full w-[70%] bg-orange-500 rounded-full"></div></div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-4 mt-8">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><BarChart3 className="w-5 h-5" /></div>
                                <div>
                                    <div className="text-2xl font-bold">$4.2M</div>
                                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full w-[85%] bg-green-500 rounded-full"></div></div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-4 -mt-8">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Shield className="w-5 h-5" /></div>
                                <div>
                                    <div className="text-2xl font-bold">Secure</div>
                                    <div className="text-sm text-muted-foreground">Biometric Auth</div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-green-600 font-medium"><Lock className="w-3 h-3" /> Encrypted</div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }} className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Zap className="w-5 h-5" /></div>
                                <div>
                                    <div className="text-2xl font-bold">99.9%</div>
                                    <div className="text-sm text-muted-foreground">System Uptime</div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900">Our Services</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need to run your organization efficiently, securely, and profitably.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {services.map((service, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:-translate-y-1"
                            >
                                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <service.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="relative z-10 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Ready to transform your business?</h2>
                        <p className="text-blue-100 text-xl max-w-2xl mx-auto">Join thousands of companies using Enterprise One to manage their operations.</p>
                        <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-10 text-lg font-semibold shadow-xl" onClick={() => navigate('/register')}>
                            Get Started Now
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-12 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-white text-xl">
                            <Globe className="w-6 h-6 text-blue-500" /> Enterprise One
                        </div>
                        <p>Empowering optimal performance for modern enterprises.</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">Product</h4>
                        <ul className="space-y-2">
                            <li>Features</li>
                            <li>Pricing</li>
                            <li>Security</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">Company</h4>
                        <ul className="space-y-2">
                            <li>About Us</li>
                            <li>Careers</li>
                            <li>Contact</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">Legal</h4>
                        <ul className="space-y-2">
                            <li>Privacy Policy</li>
                            <li>Terms of Service</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 text-center text-sm">
                    © 2026 Enterprise One Inc. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
