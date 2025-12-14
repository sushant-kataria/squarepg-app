import React, { useEffect, useState } from 'react';
import { X, Calendar, DollarSign, Phone, Mail, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tenant, Payment } from '../types';

interface TenantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({ isOpen, onClose, tenant }) => {
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tenant?.id) {
        fetchHistory(tenant.id);
    }
  }, [isOpen, tenant]);

  const fetchHistory = async (tenantId: string | number) => {
      setLoading(true);
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('tenantId', tenantId)
        .order('date', { ascending: false });
      
      if (data) setHistory(data);
      setLoading(false);
  }

  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-2xl rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200 max-h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl font-bold">
                {tenant.name.charAt(0)}
             </div>
             <div>
                 <h3 className="text-xl font-bold text-foreground">{tenant.name}</h3>
                 <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                    tenant.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                 }`}>
                     {tenant.status}
                 </span>
             </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-border">
             <div className="space-y-3">
                 <div className="flex items-center gap-3 text-sm text-muted-foreground">
                     <Home className="w-4 h-4" /> Room {tenant.roomNumber}
                 </div>
                 <div className="flex items-center gap-3 text-sm text-muted-foreground">
                     <Calendar className="w-4 h-4" /> Joined {tenant.joinDate}
                 </div>
                 <div className="flex items-center gap-3 text-sm text-muted-foreground">
                     <DollarSign className="w-4 h-4" /> Rent: ₹{tenant.rentAmount}
                 </div>
             </div>
             <div className="space-y-3">
                 <div className="flex items-center gap-3 text-sm text-muted-foreground">
                     <Phone className="w-4 h-4" /> {tenant.phone}
                 </div>
                 <div className="flex items-center gap-3 text-sm text-muted-foreground">
                     <Mail className="w-4 h-4" /> {tenant.email || 'No email'}
                 </div>
                 <div className="flex items-center gap-3 text-sm">
                     <span className="font-medium text-foreground">Current Status:</span>
                     <span className={tenant.rentStatus === 'Paid' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {tenant.rentStatus}
                     </span>
                 </div>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Payment History</h4>
            {loading ? (
                <div className="text-center py-4">Loading history...</div>
            ) : history.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No payment history found.</div>
            ) : (
                <div className="space-y-2">
                    {history.map(pay => (
                        <div key={pay.id} className="flex justify-between items-center p-3 rounded-lg bg-secondary/30 border border-border">
                            <div>
                                <p className="font-medium text-sm text-foreground">{pay.type}</p>
                                <p className="text-xs text-muted-foreground">{pay.date} • {pay.method}</p>
                            </div>
                            <span className="text-green-600 font-mono font-medium">+ ₹{pay.amount.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TenantDetailsModal;