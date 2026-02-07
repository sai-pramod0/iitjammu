import { useState, useEffect } from 'react';
import { useAuth, api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Lightbulb, ThumbsUp, MessageSquare, Plus, Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function IdeasPage() {
    const { user } = useAuth();
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newIdeaOpen, setNewIdeaOpen] = useState(false);
    const [newIdea, setNewIdea] = useState({ title: '', description: '', category: 'feature' });
    const [expandedIdea, setExpandedIdea] = useState(null);
    const [feedbackContent, setFeedbackContent] = useState('');

    const fetchIdeas = async () => {
        try {
            const res = await api.get('/validation/ideas');
            setIdeas(res.data);
        } catch (err) {
            toast.error('Failed to load ideas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIdeas();
    }, []);

    const handleCreateIdea = async () => {
        try {
            if (!newIdea.title || !newIdea.description) return toast.error('Please fill all fields');
            await api.post('/validation/ideas', newIdea);
            toast.success('Idea submitted successfully');
            setNewIdea({ title: '', description: '', category: 'feature' });
            setNewIdeaOpen(false);
            fetchIdeas();
        } catch (err) {
            toast.error('Failed to submit idea');
        }
    };

    const handleVote = async (id) => {
        try {
            const res = await api.post(`/validation/ideas/${id}/vote`);
            setIdeas(ideas.map(i => {
                if (i.id === id) {
                    const isVoted = res.data.action === 'voted';
                    return {
                        ...i,
                        votes: i.votes + (isVoted ? 1 : -1),
                        voters: isVoted ? [...(i.voters || []), user.id] : (i.voters || []).filter(v => v !== user.id)
                    };
                }
                return i;
            }));
        } catch (err) {
            toast.error('Failed to vote');
        }
    };

    const handleAddFeedback = async (id) => {
        try {
            if (!feedbackContent.trim()) return;
            const res = await api.post(`/validation/ideas/${id}/feedback`, { content: feedbackContent, sentiment: 'neutral' });
            setIdeas(ideas.map(i => {
                if (i.id === id) {
                    return { ...i, feedback: [...(i.feedback || []), res.data] };
                }
                return i;
            }));
            setFeedbackContent('');
            toast.success('Feedback added');
        } catch (err) {
            toast.error('Failed to add feedback');
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
                        <Lightbulb className="w-8 h-8 text-yellow-500" /> Idea Validation
                    </h1>
                    <p className="text-muted-foreground mt-1">Validate features and gather feedback from your team.</p>
                </div>
                <Dialog open={newIdeaOpen} onOpenChange={setNewIdeaOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> New Idea</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Submit New Idea</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={newIdea.title} onChange={e => setNewIdea({ ...newIdea, title: e.target.value })} placeholder="e.g., Dark Mode" />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={newIdea.description} onChange={e => setNewIdea({ ...newIdea, description: e.target.value })} placeholder="Describe the feature..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateIdea}>Submit Idea</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ideas.map((idea) => (
                        <motion.div key={idea.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="mb-2">{idea.category}</Badge>
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Open</Badge>
                                    </div>
                                    <CardTitle className="text-xl leading-tight">{idea.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">{idea.description}</p>

                                    {expandedIdea === idea.id && (
                                        <div className="mt-4 pt-4 border-t space-y-3">
                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Feedback</h4>
                                            <div className="max-h-40 overflow-y-auto space-y-2">
                                                {idea.feedback?.length === 0 && <p className="text-xs text-muted-foreground italic">No feedback yet.</p>}
                                                {idea.feedback?.map((f, i) => (
                                                    <div key={i} className="bg-muted/50 p-2 rounded text-sm">
                                                        <p className="font-semibold text-xs">{f.user_name}</p>
                                                        <p>{f.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Add feedback..."
                                                    value={feedbackContent}
                                                    onChange={e => setFeedbackContent(e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                                <Button size="sm" onClick={() => handleAddFeedback(idea.id)}><Send className="w-3 h-3" /></Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="border-t pt-4 flex justify-between items-center bg-muted/5">
                                    <Button
                                        variant={idea.voters?.includes(user?.id) ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => handleVote(idea.id)}
                                        className="gap-2"
                                    >
                                        <ThumbsUp className="w-4 h-4" /> {idea.votes}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setExpandedIdea(expandedIdea === idea.id ? null : idea.id)}>
                                        <MessageSquare className="w-4 h-4 mr-1" /> {idea.feedback?.length || 0}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
