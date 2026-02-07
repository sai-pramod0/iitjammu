import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';

const ROLE_COLORS = {
  super_admin: 'bg-red-100 text-red-800 border-red-200',
  main_handler: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
  ceo: 'bg-purple-100 text-purple-800 border-purple-200',
  hr: 'bg-pink-100 text-pink-800 border-pink-200',
  manager: 'bg-orange-100 text-orange-800 border-orange-200',
  server: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  employee: 'bg-green-100 text-green-800 border-green-200'
};

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).catch(() => { });
  }, []);

  const updateRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee', department: '' });
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await api.post('/users/create', newUser);
      toast.success(`User created! Temp Password: ${newUser.password}`, { duration: 10000 });
      setUsers([...users, { ...newUser, id: res.data.user_id, biometric_enabled: false }]);
      setOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'employee', department: '' });
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create user'); }
    finally { setAdding(false); }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete user'); }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="user-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage user accounts and roles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>Create a new user account. They will receive an email instruction.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Initial Password</Label>
                <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} placeholder="e.g. Sales" required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="main_handler">Main Handler</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={adding}>
                  {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Account
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs uppercase tracking-wider font-medium">User</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium">Department</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium">Subscription</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium">Biometric</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium w-48">Role</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id} className="hover:bg-muted/30 transition-colors" data-testid={`user-row-${u.id}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell className="capitalize">{u.department}</TableCell>
                <TableCell className="capitalize">{u.subscription}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${u.biometric_enabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                    {u.biometric_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user?.role === 'super_admin' && u.id !== user?.id ? (
                    <Select value={u.role} onValueChange={v => updateRole(u.id, v)}>
                      <SelectTrigger className="h-8 text-xs" data-testid={`role-select-${u.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="main_handler">Main Handler</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="ceo">CEO</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="server">Server</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role]}`}>{u.role?.replace('_', ' ')}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {u.id !== user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone. This will permanently delete the user account.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
