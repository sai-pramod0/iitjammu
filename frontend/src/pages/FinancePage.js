import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import { Plus } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const INV_STATUS_COLORS = { draft: 'bg-slate-100 text-slate-800', sent: 'bg-blue-100 text-blue-800', paid: 'bg-green-100 text-green-800', overdue: 'bg-red-100 text-red-800' };
const EXP_STATUS_COLORS = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

export default function FinancePage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showInvDialog, setShowInvDialog] = useState(false);
  const [showExpDialog, setShowExpDialog] = useState(false);
  const [invForm, setInvForm] = useState({ client_name: '', client_email: '', items: [{ description: '', quantity: 1, rate: 0 }], due_date: '' });
  const [expForm, setExpForm] = useState({ title: '', amount: 0, category: 'other' });
  const canCreateInvoice = ['super_admin', 'main_handler', 'admin'].includes(user?.role);

  useEffect(() => {
    api.get('/finance/invoices').then(r => setInvoices(r.data)).catch(() => {});
    api.get('/finance/expenses').then(r => setExpenses(r.data)).catch(() => {});
  }, []);

  const createInvoice = async () => {
    if (!invForm.client_name || !invForm.due_date) { toast.error('Client name and due date required'); return; }
    try {
      const payload = { ...invForm, items: invForm.items.map(i => ({ ...i, quantity: parseInt(i.quantity) || 1, rate: parseFloat(i.rate) || 0 })) };
      const res = await api.post('/finance/invoices', payload);
      setInvoices([...invoices, res.data]);
      setShowInvDialog(false);
      setInvForm({ client_name: '', client_email: '', items: [{ description: '', quantity: 1, rate: 0 }], due_date: '' });
      toast.success('Invoice created');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const createExpense = async () => {
    if (!expForm.title) { toast.error('Title required'); return; }
    try {
      const res = await api.post('/finance/expenses', { ...expForm, amount: parseFloat(expForm.amount) || 0 });
      setExpenses([...expenses, res.data]);
      setShowExpDialog(false);
      setExpForm({ title: '', amount: 0, category: 'other' });
      toast.success('Expense submitted');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const addItem = () => setInvForm({ ...invForm, items: [...invForm.items, { description: '', quantity: 1, rate: 0 }] });
  const updateItem = (idx, field, val) => {
    const items = [...invForm.items];
    items[idx] = { ...items[idx], [field]: val };
    setInvForm({ ...invForm, items });
  };

  const totalInvoiceValue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6" data-testid="finance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Finance</h1>
          <p className="text-muted-foreground text-sm mt-1">Invoices and expense tracking</p>
        </div>
        <div className="flex gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Invoiced</p>
            <p className="text-lg font-bold font-mono" style={{ fontFamily: 'JetBrains Mono' }}>${totalInvoiceValue.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Expenses</p>
            <p className="text-lg font-bold font-mono" style={{ fontFamily: 'JetBrains Mono' }}>${totalExpenses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList data-testid="finance-tabs">
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses ({expenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          {canCreateInvoice && (
            <div className="flex justify-end">
              <Button onClick={() => setShowInvDialog(true)} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="add-invoice-btn">
                <Plus className="w-4 h-4 mr-2" /> Create Invoice
              </Button>
            </div>
          )}
          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Invoice #</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Client</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Due Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors" data-testid={`inv-row-${inv.id}`}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="font-medium">{inv.client_name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{inv.due_date}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${INV_STATUS_COLORS[inv.status]}`}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono font-semibold">${inv.total?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No invoices</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowExpDialog(true)} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="add-expense-btn">
              <Plus className="w-4 h-4 mr-2" /> Submit Expense
            </Button>
          </div>
          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Title</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Category</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Submitted By</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(exp => (
                  <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors" data-testid={`exp-row-${exp.id}`}>
                    <TableCell className="font-medium">{exp.title}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{exp.category}</TableCell>
                    <TableCell className="text-muted-foreground">{exp.submitted_by_name}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${EXP_STATUS_COLORS[exp.status]}`}>{exp.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono font-semibold">${exp.amount?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Dialog */}
      <Dialog open={showInvDialog} onOpenChange={setShowInvDialog}>
        <DialogContent className="max-w-lg" data-testid="add-invoice-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Manrope' }}>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Client Name</Label><Input value={invForm.client_name} onChange={e => setInvForm({ ...invForm, client_name: e.target.value })} data-testid="inv-client-input" /></div>
              <div className="space-y-2"><Label>Client Email</Label><Input type="email" value={invForm.client_email} onChange={e => setInvForm({ ...invForm, client_email: e.target.value })} data-testid="inv-email-input" /></div>
            </div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={invForm.due_date} onChange={e => setInvForm({ ...invForm, due_date: e.target.value })} data-testid="inv-due-input" /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Line Items</Label><Button type="button" variant="ghost" size="sm" onClick={addItem} data-testid="add-inv-item">+ Add Item</Button></div>
              {invForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end">
                  <Input className="col-span-3" placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} data-testid={`inv-item-desc-${idx}`} />
                  <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} data-testid={`inv-item-qty-${idx}`} />
                  <Input type="number" placeholder="Rate" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} data-testid={`inv-item-rate-${idx}`} />
                  <span className="text-sm font-mono py-2">${((parseInt(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvDialog(false)}>Cancel</Button>
            <Button onClick={createInvoice} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="save-invoice-btn">Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpDialog} onOpenChange={setShowExpDialog}>
        <DialogContent data-testid="add-expense-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Manrope' }}>Submit Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={expForm.title} onChange={e => setExpForm({ ...expForm, title: e.target.value })} data-testid="exp-title-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount ($)</Label><Input type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} data-testid="exp-amount-input" /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}>
                  <SelectTrigger data-testid="exp-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="meals">Meals</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="supplies">Supplies</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpDialog(false)}>Cancel</Button>
            <Button onClick={createExpense} className="bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,48%)] text-white" data-testid="save-expense-btn">Submit Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
