import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Plus, GripVertical, Calendar, LayoutList, Kanban as KanbanIcon } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { toast } from 'sonner';
import ProjectAssistantBot from '../components/ProjectAssistantBot';
import ProjectManagement from '../components/ProjectManagement';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-t-slate-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { id: 'review', label: 'Review', color: 'border-t-amber-500' },
  { id: 'done', label: 'Done', color: 'border-t-green-500' },
];

const PRIORITY_COLORS = { low: 'bg-slate-100 text-slate-700', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700' };

export default function ProjectsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', project: '', due_date: '' });
  const [view, setView] = useState('kanban'); // 'kanban' or 'projects'

  const [projectsList, setProjectsList] = useState([]);

  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  const loadTasks = () => {
    api.get('/projects/tasks').then(r => setTasks(r.data)).catch(() => { });
  };

  const loadProjects = () => {
    api.get('/projects').then(r => setProjectsList(r.data)).catch(() => { });
  };

  const createTask = async () => {
    if (!form.title) { toast.error('Title required'); return; }
    if (!form.project) { toast.error('Project required'); return; }
    try {
      const res = await api.post('/projects/tasks', form);
      setTasks([...tasks, res.data]);
      setShowDialog(false);
      setForm({ title: '', description: '', status: 'todo', priority: 'medium', project: '', due_date: '' });
      toast.success('Task created');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/projects/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? res.data : t));
      toast.success('Task moved');
    } catch (err) { toast.error('Failed to move task'); }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="projects-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Projects & Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage project budgets and team tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={setView} className="w-[300px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="kanban"><KanbanIcon className="w-4 h-4 mr-2" />Tasks</TabsTrigger>
              <TabsTrigger value="projects"><LayoutList className="w-4 h-4 mr-2" />Projects</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'kanban' && (
            <Button onClick={() => setShowDialog(true)} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="add-task-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          )}
        </div>
      </div>

      {view === 'projects' ? (
        <ProjectManagement />
      ) : (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kanban-board">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
                <div className={`kanban-column space-y-2 p-2 bg-muted/30 rounded-lg border-t-2 ${col.color}`} data-testid={`kanban-col-${col.id}`}>
                  {colTasks.map((task, i) => (
                    <motion.div key={task.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-default" data-testid={`task-card-${task.id}`}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug">{task.title}</p>
                            <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                            {task.due_date && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />{task.due_date}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 pt-1">
                            {COLUMNS.filter(c => c.id !== task.status).map(c => (
                              <button
                                key={c.id}
                                onClick={() => moveTask(task.id, c.id)}
                                className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                                data-testid={`move-${task.id}-${c.id}`}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  {colTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="add-task-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Manrope' }}>Add New Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} data-testid="task-title-input" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} data-testid="task-desc-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={form.project} onValueChange={v => setForm({ ...form, project: v })}>
                  <SelectTrigger data-testid="task-project-select">
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsList.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                    {projectsList.length === 0 && <SelectItem value="default" disabled>No active projects</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} data-testid="task-duedate-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={createTask} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="save-task-btn">Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProjectAssistantBot key={tasks.length} />
    </div>
  );
}
