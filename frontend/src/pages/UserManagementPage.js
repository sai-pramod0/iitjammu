import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const ROLE_COLORS = {
  super_admin: 'bg-red-100 text-red-800 border-red-200',
  main_handler: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
  employee: 'bg-green-100 text-green-800 border-green-200'
};

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const updateRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="user-management-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage user accounts and roles</p>
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
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role]}`}>{u.role?.replace('_', ' ')}</Badge>
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
