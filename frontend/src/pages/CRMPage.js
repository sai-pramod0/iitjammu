import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const STATUS_COLORS = { new: 'bg-blue-100 text-blue-800', contacted: 'bg-amber-100 text-amber-800', qualified: 'bg-green-100 text-green-800', lost: 'bg-red-100 text-red-800' };
const STAGE_COLORS = { prospecting: 'bg-slate-100 text-slate-800', negotiation: 'bg-amber-100 text-amber-800', proposal: 'bg-blue-100 text-blue-800', closed_won: 'bg-green-100 text-green-800', closed_lost: 'bg-red-100 text-red-800' };

export default function CRMPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [search, setSearch] = useState('');
  const [showLeadDialog, setShowLeadDialog] = useState(false);
  const [showDealDialog, setShowDealDialog] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', company: '', status: 'new', value: 0 });
  const [dealForm, setDealForm] = useState({ title: '', value: 0, stage: 'prospecting' });
  const canEdit = ['super_admin', 'main_handler', 'admin'].includes(user?.role);

  useEffect(() => {
    api.get('/crm/leads').then(r => setLeads(r.data)).catch(() => {});
    api.get('/crm/deals').then(r => setDeals(r.data)).catch(() => {});
  }, []);

  const createLead = async () => {
    try {
      const res = await api.post('/crm/leads', { ...leadForm, value: parseFloat(leadForm.value) || 0 });
      setLeads([...leads, res.data]);
      setShowLeadDialog(false);
      setLeadForm({ name: '', email: '', company: '', status: 'new', value: 0 });
      toast.success('Lead created');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const deleteLead = async (id) => {
    try {
      await api.delete(`/crm/leads/${id}`);
      setLeads(leads.filter(l => l.id !== id));
      toast.success('Lead deleted');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const createDeal = async () => {
    try {
      const res = await api.post('/crm/deals', { ...dealForm, value: parseFloat(dealForm.value) || 0 });
      setDeals([...deals, res.data]);
      setShowDealDialog(false);
      setDealForm({ title: '', value: 0, stage: 'prospecting' });
      toast.success('Deal created');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const filtered = leads.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="crm-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage leads, deals, and pipelines</p>
        </div>
      </div>

      <Tabs defaultValue="leads">
        <TabsList data-testid="crm-tabs">
          <TabsTrigger value="leads" data-testid="tab-leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="deals" data-testid="tab-deals">Deals ({deals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search leads..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="lead-search" />
            </div>
            {canEdit && (
              <Button onClick={() => setShowLeadDialog(true)} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="add-lead-btn">
                <Plus className="w-4 h-4 mr-2" /> Add Lead
              </Button>
            )}
          </div>

          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Company</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium text-right">Value</TableHead>
                  {canEdit && <TableHead className="text-xs uppercase tracking-wider font-medium w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(lead => (
                  <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors" data-testid={`lead-row-${lead.id}`}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.company}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${STATUS_COLORS[lead.status]}`}>{lead.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">${lead.value?.toLocaleString()}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteLead(lead.id)} data-testid={`delete-lead-${lead.id}`}>
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pipeline view</p>
            {canEdit && (
              <Button onClick={() => setShowDealDialog(true)} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="add-deal-btn">
                <Plus className="w-4 h-4 mr-2" /> Add Deal
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {['prospecting', 'negotiation', 'proposal', 'closed_won', 'closed_lost'].map(stage => (
              <div key={stage} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${STAGE_COLORS[stage]}`}>{stage.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>
                  <span className="text-xs text-muted-foreground">({deals.filter(d => d.stage === stage).length})</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {deals.filter(d => d.stage === stage).map(deal => (
                    <motion.div key={deal.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="border shadow-sm hover:border-primary/30 transition-colors" data-testid={`deal-card-${deal.id}`}>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium">{deal.title}</p>
                          <p className="text-lg font-bold font-mono mt-1" style={{ fontFamily: 'JetBrains Mono' }}>${deal.value?.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Lead Dialog */}
      <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
        <DialogContent data-testid="add-lead-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Manrope' }}>Add New Lead</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name</Label><Input value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} data-testid="lead-name-input" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} data-testid="lead-email-input" /></div>
            <div className="space-y-2"><Label>Company</Label><Input value={leadForm.company} onChange={e => setLeadForm({ ...leadForm, company: e.target.value })} data-testid="lead-company-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={leadForm.status} onValueChange={v => setLeadForm({ ...leadForm, status: v })}>
                  <SelectTrigger data-testid="lead-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Value ($)</Label><Input type="number" value={leadForm.value} onChange={e => setLeadForm({ ...leadForm, value: e.target.value })} data-testid="lead-value-input" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadDialog(false)}>Cancel</Button>
            <Button onClick={createLead} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="save-lead-btn">Save Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deal Dialog */}
      <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
        <DialogContent data-testid="add-deal-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Manrope' }}>Add New Deal</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })} data-testid="deal-title-input" /></div>
            <div className="space-y-2"><Label>Value ($)</Label><Input type="number" value={dealForm.value} onChange={e => setDealForm({ ...dealForm, value: e.target.value })} data-testid="deal-value-input" /></div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={dealForm.stage} onValueChange={v => setDealForm({ ...dealForm, stage: v })}>
                <SelectTrigger data-testid="deal-stage-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDealDialog(false)}>Cancel</Button>
            <Button onClick={createDeal} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="save-deal-btn">Save Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
