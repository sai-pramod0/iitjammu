import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { Plus, Check, X } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';

const LEAVE_STATUS_COLORS = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
const DEPT_COLORS = { executive: 'bg-purple-100 text-purple-800', operations: 'bg-blue-100 text-blue-800', sales: 'bg-teal-100 text-teal-800', engineering: 'bg-amber-100 text-amber-800' };

export default function HRPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ type: 'annual', start_date: '', end_date: '', reason: '' });
  const canApprove = ['super_admin', 'main_handler', 'admin'].includes(user?.role);

  useEffect(() => {
    api.get('/hr/employees').then(r => setEmployees(r.data)).catch(() => {});
    api.get('/hr/leaves').then(r => setLeaves(r.data)).catch(() => {});
  }, []);

  const createLeave = async () => {
    if (!form.start_date || !form.end_date) { toast.error('Dates required'); return; }
    try {
      const res = await api.post('/hr/leaves', form);
      setLeaves([...leaves, res.data]);
      setShowDialog(false);
      setForm({ type: 'annual', start_date: '', end_date: '', reason: '' });
      toast.success('Leave request submitted');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const updateLeave = async (id, status) => {
    try {
      const res = await api.put(`/hr/leaves/${id}`, { status });
      setLeaves(leaves.map(l => l.id === id ? res.data : l));
      toast.success(`Leave ${status}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="hr-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>HR</h1>
          <p className="text-muted-foreground text-sm mt-1">Employee directory and leave management</p>
        </div>
      </div>

      <Tabs defaultValue="directory">
        <TabsList data-testid="hr-tabs">
          <TabsTrigger value="directory" data-testid="tab-directory">Directory ({employees.length})</TabsTrigger>
          <TabsTrigger value="leaves" data-testid="tab-leaves">Leave Requests ({leaves.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-4">
          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Employee</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Department</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Role</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map(emp => (
                  <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors" data-testid={`emp-row-${emp.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{emp.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{emp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${DEPT_COLORS[emp.department] || ''}`}>{emp.department}</Badge></TableCell>
                    <TableCell className="text-sm capitalize">{emp.role?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm capitalize">{emp.subscription}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowDialog(true)} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="add-leave-btn">
              <Plus className="w-4 h-4 mr-2" /> Request Leave
            </Button>
          </div>
          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Employee</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Type</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Dates</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Reason</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Status</TableHead>
                  {canApprove && <TableHead className="text-xs uppercase tracking-wider font-medium w-24">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map(leave => (
                  <TableRow key={leave.id} className="hover:bg-muted/30 transition-colors" data-testid={`leave-row-${leave.id}`}>
                    <TableCell className="font-medium">{leave.user_name}</TableCell>
                    <TableCell className="capitalize">{leave.type}</TableCell>
                    <TableCell className="text-sm font-mono">{leave.start_date} - {leave.end_date}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{leave.reason}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${LEAVE_STATUS_COLORS[leave.status]}`}>{leave.status}</Badge></TableCell>
                    {canApprove && leave.status === 'pending' && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => updateLeave(leave.id, 'approved')} data-testid={`approve-leave-${leave.id}`}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => updateLeave(leave.id, 'rejected')} data-testid={`reject-leave-${leave.id}`}>
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                    {canApprove && leave.status !== 'pending' && <TableCell />}
                  </TableRow>
                ))}
                {leaves.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leave requests</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="add-leave-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Manrope' }}>Request Leave</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger data-testid="leave-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} data-testid="leave-start-input" /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} data-testid="leave-end-input" /></div>
            </div>
            <div className="space-y-2"><Label>Reason</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} data-testid="leave-reason-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={createLeave} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="save-leave-btn">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
