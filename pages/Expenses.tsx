import React, { useState, useEffect } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Expense } from '../types';
import { Receipt, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

const Expenses: React.FC = () => {
  const { data: expenses, loading, setData: setExpenses } = useSupabase<Expense>('expenses');
  const { isDemo, user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: number | null}>({show: false, id: null});

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Maintenance',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // DEBUG: Check authentication status
  useEffect(() => {
    const debugAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔍 Auth Debug:');
      console.log('User from context:', user);
      console.log('Session:', session);
      console.log('Session error:', error);
      console.log('Is Demo:', isDemo);
      
      if (!session && !isDemo) {
        console.error('❌ NO SESSION - You are not authenticated in Supabase!');
      }
    };
    debugAuth();
  }, [user, isDemo]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!user && !isDemo) {
        alert("You must be logged in to add expenses.");
        setIsSubmitting(false);
        return;
    }

    if (isDemo) {
        alert("Demo Mode: Cannot add real data.");
        setIsSubmitting(false);
        return;
    }

    try {
      const { data, error } = await supabase.from('expenses').insert({
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category,
        date: formData.date,
        description: formData.description
      }).select();

      if (error) throw error;

      if (data) {
          setExpenses(prev => [...prev, ...data as Expense[]]);
      }

      setIsModalOpen(false);
      setFormData({
        title: '',
        amount: '',
        category: 'Maintenance',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
    } catch (error: any) {
      console.error("Insert Error:", error);
      alert(`Failed to add expense: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id?: string | number) => {
    console.log('🔴 handleDelete CALLED with ID:', id, 'Type:', typeof id);
    
    if (isDemo) {
        console.log('Blocked: Demo mode');
        alert("Action Restricted: You are in Demo Mode. Cannot delete real data.");
        return;
    }

    if (!id) {
        console.error('❌ ID is undefined/null');
        alert("Error: Expense ID missing.");
        return;
    }
    
    // Show custom confirmation dialog instead of browser confirm()
    console.log('Showing confirmation dialog for ID:', id);
    setDeleteConfirm({show: true, id: Number(id)});
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({show: false, id: null});
    
    if (!id) return;
    
    console.log('🗑️ Confirmed - Proceeding with delete for expense ID:', id);
    
    const previousExpenses = [...expenses];
    
    // Optimistic UI update
    console.log('Removing from UI optimistically...');
    setExpenses(prev => prev.filter(e => e.id !== id));

    try {
        console.log('Making Supabase DELETE request...');
        
        const { error, data } = await supabase
          .from('expenses')
          .delete()
          .eq('id', id)
          .select();

        console.log('📦 DELETE Response Data:', data);
        console.log('⚠️ DELETE Response Error:', error);
        
        if (error) {
            console.error('🔥 Supabase returned error:', JSON.stringify(error, null, 2));
            throw error;
        }
        
        // Check if any rows were deleted
        if (!data || data.length === 0) {
            console.error('❌ No rows returned - RLS may have blocked delete');
            throw new Error("No rows were deleted. The expense may not exist or RLS policy blocked the operation.");
        }

        console.log('✅ Successfully deleted expense:', data);
        console.log('Deleted expense details:', JSON.stringify(data[0], null, 2));
        
    } catch (error: any) {
        console.error("❌ Delete operation failed:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: error.status
        });
        
        // Revert UI on failure
        console.log('Reverting UI changes...');
        setExpenses(previousExpenses);
        
        let msg = `Failed to delete expense: ${error.message}`;
        if (error.code === '42501') {
             msg = "Permission Denied: Database RLS policy blocked this action.";
        } else if (error.code === 'PGRST116') {
             msg = "Not Found: The expense doesn't exist or you don't have permission.";
        }
        alert(msg);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-foreground">Expenses</h1>
           <p className="text-sm text-muted-foreground">Track property maintenance and operational costs.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-red-500/10 text-red-600 px-4 py-2 rounded-lg flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                <span className="font-bold text-lg">₹{totalExpenses.toLocaleString()}</span>
                <span className="text-xs text-red-700 font-medium">Total Spent</span>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 h-full"
            >
                <Plus className="w-4 h-4" /> Add Expense
            </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
                <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                    {expense.date}
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {expense.title}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground border border-border">
                        {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">
                    {expense.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-red-600">
                    - ₹{expense.amount.toLocaleString()}
                  </td>
                   <td className="px-6 py-4 text-right">
                    <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🖱️ Delete button clicked for expense:', expense.id);
                          handleDelete(expense.id);
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Delete Expense"
                        type="button"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                   </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        {loading ? 'Loading...' : 'No expenses recorded.'}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background w-full max-w-md rounded-xl shadow-2xl border border-border p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-semibold mb-4">Add New Expense</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-muted-foreground">Title</label>
                        <input 
                            required 
                            className="w-full p-2 border border-border rounded-md bg-background" 
                            placeholder="e.g. Electric Bill"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-xs font-medium uppercase text-muted-foreground">Amount</label>
                             <input 
                                required type="number" 
                                className="w-full p-2 border border-border rounded-md bg-background" 
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: e.target.value})}
                             />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-medium uppercase text-muted-foreground">Date</label>
                             <input 
                                required type="date" 
                                className="w-full p-2 border border-border rounded-md bg-background"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                             />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-muted-foreground">Category</label>
                        <select 
                            className="w-full p-2 border border-border rounded-md bg-background"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                            <option value="Maintenance">Maintenance</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Staff">Staff</option>
                            <option value="Supplies">Supplies</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase text-muted-foreground">Description</label>
                        <textarea 
                            className="w-full p-2 border border-border rounded-md bg-background" 
                            rows={2}
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-border rounded-md hover:bg-accent">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2">
                            {isSubmitting && <Loader2 className="w-3 h-3 animate-spin"/>} Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background w-full max-w-sm rounded-xl shadow-2xl border border-border p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Are you sure you want to delete this expense? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteConfirm({show: false, id: null})}
                        className="flex-1 py-2 border border-border rounded-md hover:bg-accent"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
