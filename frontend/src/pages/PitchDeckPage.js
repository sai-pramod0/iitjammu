import { useState } from 'react';
import { api } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Presentation, ChevronLeft, ChevronRight, Download, Copy, Loader2, FileText } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export default function PitchDeckPage() {
    const [slides, setSlides] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const generatePitch = async () => {
        setLoading(true);
        try {
            const res = await api.post('/ai/generate-pitch');
            setSlides(res.data);
            setCurrentSlide(0);
            toast.success('Pitch deck generated successfully');
        } catch (err) {
            toast.error('Failed to generate pitch deck');
        } finally {
            setLoading(false);
        }
    };

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

    const copyContent = () => {
        if (!slides) return;
        const text = slides.map(s => `Slide ${s.slide}: ${s.title}\n${s.content}\n[Visual: ${s.visual}]`).join('\n\n');
        navigator.clipboard.writeText(text);
        toast.success('Pitch deck content copied to clipboard');
    };

    return (
        <div className="max-w-[1200px] mx-auto space-y-8 p-6 min-h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
                        <Presentation className="w-8 h-8 text-indigo-500" /> Pitch Deck Generator
                    </h1>
                    <p className="text-muted-foreground mt-1">AI-powered slide deck structure based on your startup's live data.</p>
                </div>
                <div className="flex gap-2">
                    {slides && (
                        <Button variant="outline" onClick={copyContent}><Copy className="w-4 h-4 mr-2" /> Copy Text</Button>
                    )}
                    <Button onClick={generatePitch} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {slides ? 'Regenerate Pitch' : 'Generate Pitch Deck'}
                    </Button>
                </div>
            </div>

            {!slides && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground bg-muted/20">
                    <Presentation className="w-16 h-16 opacity-20 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">Ready to Pitch?</h3>
                    <p className="max-w-md mx-auto mt-2 mb-6">Click the button above to have our AI analyze your metrics and generate a 10-slide investor pitch deck structure.</p>
                </div>
            )}

            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                    <p className="text-muted-foreground animate-pulse">Analyzing financials, traction, and team data...</p>
                </div>
            )}

            {slides && (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-full max-w-4xl aspect-[16/9] perspective-1000">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, rotateY: 90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                exit={{ opacity: 0, rotateY: -90 }}
                                transition={{ duration: 0.4 }}
                                className="absolute inset-0"
                            >
                                <Card className="w-full h-full border shadow-xl overflow-hidden flex flex-col bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
                                    <div className="bg-indigo-600 text-white px-8 py-4 flex justify-between items-center">
                                        <h2 className="text-2xl font-bold">{slides[currentSlide].title}</h2>
                                        <span className="text-indigo-200 font-mono">Slide {slides[currentSlide].slide}/10</span>
                                    </div>
                                    <CardContent className="flex-1 p-12 flex flex-col justify-center gap-8">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                                <FileText className="w-4 h-4" /> Key Talking Points
                                            </h3>
                                            <p className="text-2xl font-medium leading-relaxed">{slides[currentSlide].content}</p>
                                        </div>
                                        <div className="p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                            <h3 className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider mb-2">Visual Suggestion</h3>
                                            <p className="text-sm text-muted-foreground italic">{slides[currentSlide].visual}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={prevSlide} className="rounded-full w-12 h-12 bg-background shadow-sm hover:scale-105 transition-transform">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <div className="flex gap-2">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentSlide(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === currentSlide ? 'bg-indigo-600 w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                                />
                            ))}
                        </div>
                        <Button variant="outline" size="icon" onClick={nextSlide} className="rounded-full w-12 h-12 bg-background shadow-sm hover:scale-105 transition-transform">
                            <ChevronRight className="w-6 h-6" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
