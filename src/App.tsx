import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Trash2, 
  PieChart as PieChartIcon,
  BarChart3,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { 
  format, 
  subMonths, 
  isAfter, 
  startOfMonth, 
  endOfMonth, 
  eachMonthOfInterval,
  parseISO
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn, formatCurrency } from './lib/utils';
import { Transaction, TransactionType, CATEGORIES } from './types';

const STORAGE_KEY = 'finance_tracker_transactions';

// Mock data for initial state
const MOCK_DATA: Transaction[] = [
  { id: '1', type: 'income', amount: 150000, category: 'Основной', date: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), description: 'Основной доход' },
  { id: '2', type: 'expense', amount: 45000, category: 'Аренда', date: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), description: 'Аренда офиса' },
  { id: '3', type: 'expense', amount: 12000, category: 'Коммуналка', date: format(subMonths(new Date(), 0), 'yyyy-MM-dd'), description: 'Электричество' },
  { id: '4', type: 'income', amount: 20000, category: 'Копир', date: format(subMonths(new Date(), 0), 'yyyy-MM-dd'), description: 'Услуги копирования' },
  { id: '5', type: 'expense', amount: 5000, category: 'Мобильн. Связь', date: format(subMonths(new Date(), 0), 'yyyy-MM-dd'), description: 'Связь' },
];

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : MOCK_DATA;
  });

  const [period, setPeriod] = useState<number>(1); // months for charts/summary
  const [listPeriod, setListPeriod] = useState<number>(1); // months for transaction list
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    amount: 0,
    category: CATEGORIES.expense[0],
    date: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const cutoff = subMonths(new Date(), period);
    return transactions
      .filter(tx => isAfter(parseISO(tx.date), cutoff))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [transactions, period]);

  const listTransactions = useMemo(() => {
    const cutoff = subMonths(new Date(), listPeriod);
    return transactions
      .filter(tx => isAfter(parseISO(tx.date), cutoff))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [transactions, listPeriod]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        if (tx.type === 'income') acc.income += tx.amount;
        else acc.expense += tx.amount;
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), period - 1),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTxs = transactions.filter(tx => {
        const date = parseISO(tx.date);
        return isAfter(date, monthStart) && !isAfter(date, monthEnd);
      });

      const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      return {
        name: format(month, 'MMM', { locale: ru }),
        income,
        expense
      };
    });
  }, [transactions, period]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredTransactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
      });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.category || !newTx.date) return;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: newTx.type as TransactionType,
      amount: Number(newTx.amount),
      category: newTx.category,
      date: newTx.date,
      description: newTx.description || ''
    };

    setTransactions([transaction, ...transactions]);
    setShowForm(false);
    setNewTx({
      type: 'expense',
      amount: 0,
      category: CATEGORIES.expense[0],
      date: format(new Date(), 'yyyy-MM-dd'),
      description: ''
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);
  };

  const deleteSelected = () => {
    setTransactions(transactions.filter(t => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === listTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(listTransactions.map(t => t.id)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Wallet className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Мои Финансы</h1>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Добавить</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Summary Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Доходы</span>
              <TrendingUp className="text-emerald-500 w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.income)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Расходы</span>
              <TrendingDown className="text-rose-500 w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(summary.expense)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Баланс</span>
              <Wallet className="text-indigo-500 w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-indigo-600">{formatCurrency(summary.balance)}</p>
          </div>
        </section>

        {/* Charts Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Аналитика</h2>
            <div className="flex bg-white p-1 rounded-lg border border-slate-200">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setPeriod(m)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    period === m 
                      ? "bg-slate-100 text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {m}м
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px'}}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="income" fill="#10b981" radius={[2, 2, 0, 0]} name="Доход" barSize={12} />
                    <Bar dataKey="expense" fill="#f43f5e" radius={[2, 2, 0, 0]} name="Расход" barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="h-48 w-full">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-300 text-sm italic">
                    Нет данных
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Операции
              </h2>
              {selectedIds.size > 0 && (
                <button 
                  onClick={deleteSelected}
                  className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Удалить ({selectedIds.size})
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Период:</span>
              <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setListPeriod(m)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-all",
                      listPeriod === m 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {m}м
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {listTransactions.length > 0 && (
              <div className="px-4 py-2 bg-slate-50/30 flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === listTransactions.length && listTransactions.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Выбрать все</span>
              </div>
            )}
            {listTransactions.length > 0 ? (
              listTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className={cn(
                    "p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group",
                    selectedIds.has(tx.id) && "bg-indigo-50/30"
                  )}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelect(tx.id)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        tx.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {tx.type === 'income' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">{tx.category}</h3>
                        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                          {format(parseISO(tx.date), 'd MMM yyyy', { locale: ru })}
                          {tx.description && ` • ${tx.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "font-bold text-sm",
                        tx.type === 'income' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <button 
                        onClick={() => deleteTransaction(tx.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm italic">
                Нет операций за выбранный период
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Add Transaction Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Новая операция</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setNewTx({ ...newTx, type: 'expense', category: CATEGORIES.expense[0] });
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                    newTx.type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-600"
                  )}
                >
                  <Minus className="w-4 h-4" /> Расход
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTx({ ...newTx, type: 'income', category: CATEGORIES.income[0] });
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                    newTx.type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600"
                  )}
                >
                  <Plus className="w-4 h-4" /> Доход
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Сумма</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    autoFocus
                    placeholder="0"
                    value={newTx.amount || ''}
                    onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">₽</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Категория</label>
                  <select
                    value={newTx.category}
                    onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {newTx.type === 'income' 
                      ? CATEGORIES.income.map(c => <option key={c} value={c}>{c}</option>)
                      : CATEGORIES.expense.map(c => <option key={c} value={c}>{c}</option>)
                    }
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Дата</label>
                  <input
                    type="date"
                    required
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Описание</label>
                <input
                  type="text"
                  placeholder="На что потратили?"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] mt-4"
              >
                Сохранить
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
