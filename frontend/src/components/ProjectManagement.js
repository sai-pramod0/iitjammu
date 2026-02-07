import { useState, useEffect } from 'react';
import { api } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Plus, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectManagement() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [newProject, setNewProject] = useState({
        name: '', description: '', value: '', client_name: '', client_email: '', status: 'active'
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            toast.error("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newProject.name || !newProject.value) {
            toast.error("Name and Value are required");
            return;
        }
        setCreating(true);
        try {
            const res = await api.post('/projects', { ...newProject, value: parseFloat(newProject.value) });
            setProjects([...projects, res.data]);
            setShowDialog(false);
            setNewProject({ name: '', description: '', value: '', client_name: '', client_email: '', status: 'active' });
            toast.success("Project created");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create project");
        } finally {
            setCreating(false);
        }
    };

    const handleComplete = async (project) => {
        if (project.status === 'completed') return;
        try {
            toast.info("Marking as completed...", { description: "Verified revenue will be added automatically." });
            const res = await api.put(`/projects/${project.id}`, { status: 'completed' });
            setProjects(projects.map(p => p.id === project.id ? res.data : p));
            toast.success("Project Completed", { description: "Invoice generated and revenue updated." });
        } catch (err) {
            toast.error("Failed to update project");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Active Projects</h2>
                    <p className="text-muted-foreground">Manage project budgets and completions.</p>
                </div>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white">
                            <Plus className="w-4 h-4 mr-2" /> New Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Project Name</Label>
                                <Input value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="e.g. Website Redesign" />
                            </div>
                            <div className="space-y-2">
                                <Label>Project Value ($)</Label>
                                <Input type="number" value={newProject.value} onChange={e => setNewProject({ ...newProject, value: e.target.value })} placeholder="0.00" />
                                <p className="text-xs text-muted-foreground">This amount will be added to revenue upon completion.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Client Name</Label>
                                    <Input value={newProject.client_name} onChange={e => setNewProject({ ...newProject, client_name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Client Email</Label>
                                    <Input value={newProject.client_email} onChange={e => setNewProject({ ...newProject, client_email: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={creating}>
                                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Create Project
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project Name</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projects.length === 0 && !loading && (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No projects found. Create one to get started.</TableCell></TableRow>
                        )}
                        {projects.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">
                                    {p.name}
                                    {p.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>}
                                </TableCell>
                                <TableCell>{p.client_name || '—'}</TableCell>
                                <TableCell className="font-mono">${p.value?.toLocaleString()}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={p.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200'}>
                                        {p.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {p.status !== 'completed' && (
                                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleComplete(p)}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
            {loading && <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
        </div>
    );
}
