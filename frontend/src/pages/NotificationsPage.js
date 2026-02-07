import { useState, useEffect } from 'react';
import { api } from '../contexts/AuthContext';
import { Bell, Mail, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { toast.error('Failed'); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="notifications-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">{unread} unread notification{unread !== 1 ? 's' : ''}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={markAllRead} data-testid="mark-all-read-btn">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map(notif => (
          <Card key={notif.id} className={`border shadow-sm transition-colors duration-200 ${!notif.read ? 'border-l-2 border-l-[hsl(221,83%,53%)] bg-blue-50/30' : ''}`} data-testid={`notif-${notif.id}`}>
            <CardContent className="flex items-start gap-4 p-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                {notif.type === 'email' ? <Mail className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{notif.title}</p>
                  <Badge variant="outline" className="text-[10px]">{notif.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(notif.created_at).toLocaleString()}</p>
              </div>
              {!notif.read && (
                <Button variant="ghost" size="sm" onClick={() => markRead(notif.id)} data-testid={`mark-read-${notif.id}`}>
                  Mark Read
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {notifications.length === 0 && (
          <Card className="border shadow-sm"><CardContent className="text-center py-12 text-muted-foreground">No notifications</CardContent></Card>
        )}
      </div>
    </div>
  );
}
