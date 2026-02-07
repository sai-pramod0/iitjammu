import { useState, useEffect } from 'react';
import { api } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, FileText, DollarSign, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ProjectAssistantBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('INR');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "JPY"];

    useEffect(() => {
        api.get('/projects/tasks').then(r => {
            const unique = [...new Set(r.data.map(t => t.project).filter(Boolean))];
            setProjects(unique);
        }).catch(console.error);
    }, []);

    const handleAnalyze = async () => {
        if (!selectedProject) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await api.post('/analytics/project-estimation', {
                project_name: selectedProject,
                currency: selectedCurrency
            });
            setResult(res.data);
        } catch (err) {
            console.error(err);
            setResult({ error: "Failed to analyze project" });
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('print-container');
        if (!element) return;

        try {
            // Unhide temporarily for capture
            element.style.display = 'block';
            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true,
                logging: false,
                windowWidth: 794 // A4 width at 96 DPI
            });
            element.style.display = 'none';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${selectedProject}_Professional_Quotation.pdf`);
        } catch (err) {
            console.error("PDF generation failed", err);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-16 right-0 w-[500px] shadow-2xl rounded-xl overflow-hidden border bg-background"
                    >
                        <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground">
                            <div className="flex items-center gap-2">
                                <Bot className="w-5 h-5" />
                                <span className="font-semibold">Project Quotation Assistant</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-primary-foreground/20 p-1 rounded">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 h-[600px] overflow-y-auto bg-muted/30">
                            {!result && !loading && (
                                <div className="space-y-4">
                                    <div className="bg-background p-3 rounded-lg border shadow-sm">
                                        <p className="text-sm">Hi! Select a project and target currency to generate a professional quotation.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground">Project</label>
                                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground">Target Currency</label>
                                            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button onClick={handleAnalyze} disabled={!selectedProject} className="w-full gap-2">
                                        <FileText className="w-4 h-4" /> Generate Document
                                    </Button>
                                </div>
                            )}

                            {loading && (
                                <div className="flex flex-col items-center justify-center h-40 space-y-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <p className="text-xs text-muted-foreground animate-pulse">Calculating financials & drafting document...</p>
                                </div>
                            )}

                            {result && (
                                <div className="space-y-4">
                                    {result.error ? (
                                        <div className="text-red-500 text-sm bg-red-50 p-3 rounded border border-red-200">{result.error}</div>
                                    ) : (
                                        <>
                                            <div id="quotation-content" className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                                                {/* Header for Screen View */}
                                                <div className="flex justify-between items-center border-b pb-4 mb-4">
                                                    <div>
                                                        <h2 className="text-xl font-bold text-slate-900">Project Quotation</h2>
                                                        <p className="text-xs text-muted-foreground">{selectedProject}</p>
                                                    </div>
                                                    <Badge variant="outline" className="bg-slate-50">Official Document</Badge>
                                                </div>

                                                {/* Dual Box Display */}
                                                <div className="grid grid-cols-2 gap-3 mb-6">
                                                    <Card className="p-3 bg-slate-50 border-slate-200 shadow-sm relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-1 bg-slate-200 rounded-bl text-[10px] font-bold text-slate-600">BASE (INR)</div>
                                                        <p className="text-xs text-muted-foreground">Internal Cost</p>
                                                        <p className="text-lg font-bold text-slate-800">
                                                            ₹{(result.estimated_cost * (result.currency === 'INR' ? 1 : (3000 / (result.total_hours > 0 ? result.estimated_cost / result.total_hours : 1)))).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">@ ₹3000/hr Base Rate</p>
                                                    </Card>

                                                    <Card className={`p-3 border shadow-sm relative overflow-hidden ${result.currency === 'INR' ? 'bg-slate-50 border-slate-200' : 'bg-green-50 border-green-200'}`}>
                                                        <div className="absolute top-0 right-0 p-1 bg-white/50 rounded-bl text-[10px] font-bold text-slate-500">CLIENT ({result.currency})</div>
                                                        <p className="text-xs text-muted-foreground">Quoted Amount</p>
                                                        <p className={`text-lg font-bold ${result.currency === 'INR' ? 'text-slate-800' : 'text-green-700'}`}>
                                                            {result.currency_symbol}{result.estimated_cost.toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">{result.total_hours} Hours Estimated</p>
                                                    </Card>
                                                </div>

                                                {/* Scrollable Preview Content */}
                                                <div
                                                    className="prose prose-sm max-w-none text-slate-700 space-y-2 text-justify [&>h3]:text-slate-900 [&>h3]:font-bold [&>h3]:mt-4 [&>h3]:mb-2 [&>table]:w-full [&>table]:border-collapse [&>table]:text-xs [&>table>thead>tr>th]:border-b-2 [&>table>thead>tr>th]:border-slate-200 [&>table>thead>tr>th]:text-left [&>table>thead>tr>th]:py-2 [&>table>tbody>tr>td]:py-2 [&>table>tbody>tr>td]:border-b [&>table>tbody>tr>td]:border-slate-100"
                                                    dangerouslySetInnerHTML={{ __html: result.ai_quotation }}
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="outline" onClick={() => setResult(null)} className="flex-1">New Quote</Button>
                                                <Button onClick={handleDownloadPDF} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                                    <FileText className="w-4 h-4 mr-2" /> Download PDF
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden Print Container - Exact A4 Dimensions */}
            {result && (
                <div id="print-container" style={{
                    display: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '794px', // A4 width at 96DPI
                    minHeight: '1123px', // A4 height
                    backgroundColor: 'white',
                    padding: '40px',
                    boxSizing: 'border-box',
                    fontSize: '12pt',
                    color: 'black'
                }}>
                    <div dangerouslySetInnerHTML={{ __html: result.ai_quotation }} />
                </div>
            )}

            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="lg"
                className="rounded-full w-14 h-14 shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
                <MessageCircle className="w-6 h-6" />
            </Button>
        </div>
    );
}
