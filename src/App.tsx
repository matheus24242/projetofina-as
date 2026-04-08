/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  PieChart, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Trash2,
  X,
  ChevronRight,
  Menu,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency } from './lib/utils';
import { Transaction, TransactionType } from './types';
import { supabase } from './lib/supabase';

// --- Constants ---
const CATEGORIES = [
  'Aluguel', 'Salários', 'Fornecedores', 'Impostos', 'Marketing', 
  'Vendas', 'Serviços', 'Investimentos', 'Outros'
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100"
  };
  
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<'dashboard' | 'payables' | 'receivables' | 'reports'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  // --- Fetch Transactions ---
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else if (data) {
      // Map Supabase snake_case to our camelCase
      const mappedData: Transaction[] = data.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        dueDate: t.due_date,
        category: t.category,
        type: t.type,
        status: t.status,
        createdAt: t.created_at
      }));
      setTransactions(mappedData);
    }
    setLoading(false);
  };

  // --- Handlers ---
  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const transactionData = {
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      due_date: formData.get('dueDate') as string,
      category: formData.get('category') as string,
      type: formData.get('type') as TransactionType,
      status: formData.get('status') as 'pending' | 'completed',
    };

    if (editingTransaction) {
      const { error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', editingTransaction.id);
      
      if (error) console.error('Error updating:', error);
    } else {
      const { error } = await supabase
        .from('transactions')
        .insert([transactionData]);
      
      if (error) console.error('Error inserting:', error);
    }
    
    fetchTransactions();
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const { error } = await supabase
      .from('transactions')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) console.error('Error toggling status:', error);
    fetchTransactions();
  };

  const deleteTransaction = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) console.error('Error deleting:', error);
      fetchTransactions();
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesType = view === 'payables' ? t.type === 'payable' : view === 'receivables' ? t.type === 'receivable' : true;
    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  });

  // --- Calculations ---
  const summary = useMemo(() => {
    return transactions.reduce((acc, t) => {
      const amount = Number(t.amount);
      if (t.type === 'payable') {
        acc.totalPayable += amount;
        if (t.status === 'pending') {
          acc.pendingPayable += amount;
          acc.pendingPayableCount += 1;
        } else {
          acc.paidPayable += amount;
          acc.paidPayableCount += 1;
        }
      } else {
        acc.totalReceivable += amount;
        if (t.status === 'pending') {
          acc.pendingReceivable += amount;
          acc.pendingReceivableCount += 1;
        } else {
          acc.receivedReceivable += amount;
          acc.receivedReceivableCount += 1;
        }
      }
      acc.balance = acc.totalReceivable - acc.totalPayable;
      return acc;
    }, { 
      totalPayable: 0, 
      totalReceivable: 0, 
      balance: 0, 
      pendingPayable: 0, 
      pendingPayableCount: 0,
      paidPayable: 0,
      paidPayableCount: 0,
      pendingReceivable: 0, 
      pendingReceivableCount: 0,
      receivedReceivable: 0,
      receivedReceivableCount: 0
    });
  }, [transactions]);

  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(new Date(), i);
      return {
        month: format(date, 'MMM', { locale: ptBR }),
        monthYear: format(date, 'MM/yyyy'),
        receivable: 0,
        payable: 0
      };
    }).reverse();

    transactions.forEach(t => {
      const tDate = parseISO(t.dueDate);
      const monthYear = format(tDate, 'MM/yyyy');
      const dataPoint = last6Months.find(d => d.monthYear === monthYear);
      if (dataPoint) {
        if (t.type === 'receivable') dataPoint.receivable += Number(t.amount);
        else dataPoint.payable += Number(t.amount);
      }
    });

    return last6Months;
  }, [transactions]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 z-40 shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <DollarSign size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Finanzo</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'payables', icon: ArrowDownCircle, label: 'Contas a Pagar' },
            { id: 'receivables', icon: ArrowUpCircle, label: 'Contas a Receber' },
            { id: 'reports', icon: PieChart, label: 'Relatórios' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                view === item.id ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <Card className="p-4 bg-blue-600 text-white border-none">
            <p className="text-xs opacity-80 mb-1">Saldo Total</p>
            <p className="text-lg font-bold">{formatCurrency(summary.balance)}</p>
          </Card>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* --- Mobile Header --- */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 shrink-0 flex items-center justify-between z-40 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <DollarSign size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Finanzo</h1>
          </div>
          <Button variant="ghost" className="p-2 rounded-full hover:bg-slate-100" onClick={() => setIsFormOpen(true)}>
            <Plus size={24} />
          </Button>
        </header>

        {/* --- Scrollable Content --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto w-full pb-24 md:pb-0">
            <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Resumo Financeiro</h2>
                <Button className="hidden md:flex" onClick={() => setIsFormOpen(true)}>
                  <Plus size={20} /> Nova Transação
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-l-blue-500 bg-blue-50/30">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-slate-500 font-medium">Saldo Atual</p>
                    <DollarSign className="text-blue-500" size={20} />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.balance)}</p>
                  <p className="text-xs text-slate-500 mt-1">Líquido total</p>
                </Card>

                <Card className="p-5 border-l-4 border-l-rose-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-slate-500 font-medium">Dívidas Pendentes</p>
                    <Clock className="text-rose-500" size={20} />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.pendingPayable)}</p>
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    {summary.pendingPayableCount} contas em aberto
                  </p>
                </Card>

                <Card className="p-5 border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-slate-500 font-medium">Contas Pagas</p>
                    <CheckCircle2 className="text-emerald-500" size={20} />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.paidPayable)}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    {summary.paidPayableCount} contas quitadas
                  </p>
                </Card>

                <Card className="p-5 border-l-4 border-l-amber-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-slate-500 font-medium">A Receber</p>
                    <ArrowUpCircle className="text-amber-500" size={20} />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.pendingReceivable)}</p>
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    {summary.pendingReceivableCount} lançamentos pendentes
                  </p>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-6">Fluxo de Caixa (6 meses)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="receivable" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="payable" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-6">Despesas por Categoria</h3>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={categoryData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(summary.totalPayable)}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recent Transactions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Transações Recentes</h3>
                  <Button variant="ghost" onClick={() => setView('payables')}>Ver Tudo</Button>
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-10 text-slate-400">Carregando...</div>
                  ) : transactions.slice(0, 5).map(t => (
                    <TransactionItem 
                      key={t.id} 
                      transaction={t} 
                      onToggle={() => toggleStatus(t.id, t.status)}
                      onEdit={() => { setEditingTransaction(t); setIsFormOpen(true); }}
                      onDelete={() => deleteTransaction(t.id)}
                    />
                  ))}
                  {!loading && transactions.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      Nenhuma transação registrada.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {(view === 'payables' || view === 'receivables') && (
            <motion.div 
              key={view}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">
                  {view === 'payables' ? 'Contas a Pagar' : 'Contas a Receber'}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar..." 
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select 
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                  >
                    <option value="all">Todos Status</option>
                    <option value="pending">Pendentes</option>
                    <option value="completed">Concluídos</option>
                  </select>
                  <select 
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="All">Categorias</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* View Specific Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-white">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Total</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(view === 'payables' ? summary.totalPayable : summary.totalReceivable)}
                  </p>
                </Card>
                <Card className="p-4 bg-white">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Pendente</p>
                  <p className="text-lg font-bold text-rose-600">
                    {formatCurrency(view === 'payables' ? summary.pendingPayable : summary.pendingReceivable)}
                  </p>
                </Card>
                <Card className="p-4 bg-white">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Concluído</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(view === 'payables' ? summary.paidPayable : summary.receivedReceivable)}
                  </p>
                </Card>
                <Card className="p-4 bg-white">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Qtd</p>
                  <p className="text-lg font-bold">
                    {view === 'payables' ? transactions.filter(t => t.type === 'payable').length : transactions.filter(t => t.type === 'receivable').length}
                  </p>
                </Card>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-20 text-slate-400">Carregando...</div>
                ) : filteredTransactions.map(t => (
                  <TransactionItem 
                    key={t.id} 
                    transaction={t} 
                    onToggle={() => toggleStatus(t.id, t.status)}
                    onEdit={() => { setEditingTransaction(t); setIsFormOpen(true); }}
                    onDelete={() => deleteTransaction(t.id)}
                  />
                ))}
                {!loading && filteredTransactions.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400">Nenhuma transação encontrada.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Relatórios Detalhados</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Projeção de Caixa</h3>
                  <p className="text-sm text-slate-500 mb-6">Comparativo entre o que você tem a receber e o que deve pagar nos próximos meses.</p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" axisLine={false} tickLine={false} hide />
                        <YAxis dataKey="month" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="receivable" name="Receber" fill="#10b981" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="payable" name="Pagar" fill="#ef4444" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Distribuição de Gastos</h3>
                  <div className="space-y-4">
                    {categoryData.sort((a, b) => b.value - a.value).map((item, i) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-slate-500">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${(item.value / summary.totalPayable) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  </div>

      {/* --- Mobile Navigation --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-around p-2 pb-safe z-40">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
          { id: 'payables', icon: ArrowDownCircle, label: 'Pagar' },
          { id: 'receivables', icon: ArrowUpCircle, label: 'Receber' },
          { id: 'reports', icon: PieChart, label: 'Relatórios' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
              view === item.id ? "text-blue-600" : "text-slate-400"
            )}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* --- Transaction Modal --- */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setIsFormOpen(false); setEditingTransaction(null); }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold">
                  {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                </h3>
                <button onClick={() => { setIsFormOpen(false); setEditingTransaction(null); }} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddTransaction} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Tipo</label>
                    <select 
                      name="type" 
                      defaultValue={editingTransaction?.type || 'payable'}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="payable">Conta a Pagar</option>
                      <option value="receivable">Conta a Receber</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <select 
                      name="status" 
                      defaultValue={editingTransaction?.status || 'pending'}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="pending">Pendente</option>
                      <option value="completed">Concluído</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Descrição</label>
                  <input 
                    name="description" 
                    required 
                    defaultValue={editingTransaction?.description}
                    placeholder="Ex: Aluguel, Venda de Produto..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Valor (R$)</label>
                    <input 
                      name="amount" 
                      type="number" 
                      step="0.01" 
                      required 
                      defaultValue={editingTransaction?.amount}
                      placeholder="0,00"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Data de Vencimento</label>
                    <input 
                      name="dueDate" 
                      type="date" 
                      required 
                      defaultValue={editingTransaction?.dueDate || format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Categoria</label>
                  <select 
                    name="category" 
                    defaultValue={editingTransaction?.category || 'Outros'}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full py-3 text-lg">
                    {editingTransaction ? 'Salvar Alterações' : 'Adicionar Transação'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TransactionItemProps {
  key?: string;
  transaction: Transaction;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TransactionItem({ 
  transaction, 
  onToggle, 
  onEdit, 
  onDelete 
}: TransactionItemProps) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4"
    >
      <button 
        onClick={onToggle}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
          transaction.status === 'completed' 
            ? "bg-emerald-50 text-emerald-500" 
            : "bg-slate-50 text-slate-300 hover:text-blue-500"
        )}
      >
        {transaction.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className={cn(
            "font-bold truncate",
            transaction.status === 'completed' && "text-slate-400 line-through font-normal"
          )}>
            {transaction.description}
          </h4>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
            {transaction.category}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarIcon size={12} />
            {format(parseISO(transaction.dueDate), "dd 'de' MMM", { locale: ptBR })}
          </span>
          <span className={cn(
            "flex items-center gap-1 font-semibold",
            transaction.type === 'receivable' ? "text-emerald-600" : "text-rose-600"
          )}>
            {transaction.type === 'receivable' ? '+' : '-'} {formatCurrency(transaction.amount)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" className="p-2 h-auto" onClick={onEdit}>
          <MoreVertical size={18} />
        </Button>
        <Button variant="danger" className="p-2 h-auto" onClick={onDelete}>
          <Trash2 size={18} />
        </Button>
      </div>
      
      <div className="md:hidden">
        <ChevronRight className="text-slate-300" size={20} />
      </div>
    </motion.div>
  );
}
