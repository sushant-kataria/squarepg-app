import React, { useState } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import { Payment } from '../types';
import { IndianRupee, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Payments: React.FC = () => {
  const { data: payments, setData: setPayments } = useSupabase<Payment>('payments');
  const { isDemo } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: number | null}>({show: false, id: null});
  
  const sortedPayments = payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = (id?: string | number) => {
      if (isDemo) {
          alert("Action Restricted: You are in Demo Mode. Cannot delete real data.");
          return;
      }

      if (!id) {
          alert("Error: Missing Record ID");
          return;
      }

      setDeleteConfirm({show: true, id: Number(id)});
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({show: false, id: null});
    
    if (!id) return;

    const previousPayments = [...payments];
    setPayments(prev => prev.filter(p => p.id !== id));

    try {
        const { error, data } = await supabase
          .from('payments')
          .delete()
          .eq('id', id)
          .select();
        
        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("No rows deleted. RLS policy may have blocked the operation.");
        }

        console.log('✅ Payment deleted successfully');
    } catch (error: any) {
        console.error("Delete failed:", error);
        setPayments(previousPayments);
        
        let msg = `Failed to delete: ${error.message}`;
        if (error.code === '42501') {
            msg = "PERMISSION DENIED: Check your Supabase RLS policies for the 'payments' table.";
        }
        alert(msg);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-foreground">Payments</h1>
           <p className="text-sm text-muted-foreground">Transaction history and financial records.</p>
        </div>
        <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-lg flex items-center gap-2">
            <IndianRupee className="w-5 h-5" />
            <span className="font-bold text-lg">₹{totalCollected.toLocaleString()}</span>
            <span className="text-xs text-green-700 font-medium">Total Collected</span>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/20">
            <h3 className="font-semibold text-foreground">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Tenant</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                    {payment.date}
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {payment.tenantName}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
                        {payment.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {payment.method}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-green-600">
                    + ₹{payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                        onClick={() => handleDelete(payment.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Delete Transaction"
                        type="button"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sortedPayments.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        No transactions recorded yet.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background w-full max-w-sm rounded-xl shadow-2xl border border-border p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Are you sure you want to delete this payment record? This action cannot be undone.
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

export default Payments;
