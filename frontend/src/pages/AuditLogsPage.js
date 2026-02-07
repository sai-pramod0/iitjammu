import { useState, useEffect } from 'react';
import { api } from '../contexts/AuthContext';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const ACTION_COLORS = {
  login: 'bg-blue-100 text-blue-800', create: 'bg-green-100 text-green-800', update: 'bg-amber-100 text-amber-800',
  delete: 'bg-red-100 text-red-800', checkout: 'bg-violet-100 text-violet-800', biometric_register: 'bg-teal-100 text-teal-800',
  update_role: 'bg-orange-100 text-orange-800', subscription_activated: 'bg-emerald-100 text-emerald-800',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/audit-logs').then(r => setLogs(r.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="audit-logs-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all actions across the platform</p>
      </div>

      <Card className="border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs uppercase tracking-wider font-medium">Timestamp</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium">User</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium">Action</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium">Resource</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-medium">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id} className="hover:bg-muted/30 transition-colors" data-testid={`log-row-${log.id}`}>
                <TableCell className="font-mono text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell className="font-medium text-sm">{log.user_name}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${ACTION_COLORS[log.action] || ''}`}>{log.action}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.resource}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{log.details}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
