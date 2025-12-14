import React, { useState } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, Trash2, Loader2 } from 'lucide-react';
import { Complaint, Tenant } from '../types';
import { useAuth } from '../context/AuthContext';

const Complaints: React.FC = () => {
  const { data: complaints, loading: l1, setData: setComplaints } = useSupabase<Complaint>('complaints');
  const { isDemo } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: number | null}>({show: false, id: null});
  
  const updateStatus = async (id: string | number, status: 'Resolved' | 'In Progress') => {
    // Optimistic Update
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    
    try {
        await supabase.from('complaints').update({ status }).eq('id', id);
    } catch (e) {
        console.error(e);
    }
  };

  const handleDeleteComplaint = (id: string | number) => {
    if (isDemo) {
        alert("Action Restricted: You are in Demo Mode. Cannot delete real data.");
        return;
    }

    if (!id) {
        alert("Error: Complaint ID missing.");
        return;
    }

    setDeleteConfirm({show: true, id: Number(id)});
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({show: false, id: null});
    
    if (!id) return;
    
    const prev = [...complaints];
    setComplaints(prev => prev.filter(c => c.id !== id));
    
    try {
        const { error, data } = await supabase
          .from('complaints')
          .delete()
          .eq('id', id)
          .select();
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            throw new Error("No rows deleted. RLS policy may have blocked the operation.");
        }
        
        console.log('✅ Complaint deleted successfully');
    } catch (e: any) {
        console.error('Delete failed:', e);
        alert(`Failed to delete complaint: ${e.message}`);
        setComplaints(prev);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-foreground">Complaints</h1>
           <p className="text-sm text-muted-foreground">Track and resolve issues reported by tenants.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {complaints.length === 0 && (
             <div className="col-span-full py-12 text-center text-muted-foreground">
                 <p>No complaints active.</p>
                 <p className="text-xs mt-1">Tenants can add complaints from their dashboard.</p>
             </div>
        )}
        {complaints.map((c) => (
          <div key={c.id} className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between hover:border-primary/30 transition-all">
             <div>
                <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                        c.priority === 'High' ? 'bg-red-100 text-red-700' : 
                        c.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                        {c.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
                        c.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                        {c.status}
                    </span>
                </div>
                <h3 className="font-semibold text-foreground">{c.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <span className="font-medium text-foreground">{c.tenantName}</span>
                    <span>•</span>
                    <span>{c.date}</span>
                </div>
             </div>
             
             <div className="flex justify-end gap-2 border-t border-border pt-4">
                 {c.status !== 'Resolved' && (
                     <button onClick={() => updateStatus(c.id!, 'Resolved')} className="p-2 text-green-600 hover:bg-green-50 rounded-md" title="Mark Resolved">
                        <CheckCircle className="w-4 h-4" />
                     </button>
                 )}
                 {c.status === 'Open' && (
                     <button onClick={() => updateStatus(c.id!, 'In Progress')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md" title="Mark In Progress">
                        <Clock className="w-4 h-4" />
                     </button>
                 )}
                 <button 
                    onClick={() => handleDeleteComplaint(c.id!)} 
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md" 
                    title="Delete"
                    type="button"
                 >
                     <Trash2 className="w-4 h-4" />
                 </button>
             </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background w-full max-w-sm rounded-xl shadow-2xl border border-border p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
                <p className="text-sm text-muted-foreground mb-6">
                    Are you sure you want to delete this complaint? This action cannot be undone.
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

export default Complaints;
