import React, { useState } from 'react';
import { Search, MessageCircle, Trash2, UserPlus, X, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import AddTenantModal from '../components/AddTenantModal';
import EditTenantModal from '../components/EditTenantModal';
import TenantDetailsModal from '../components/TenantDetailsModal';
import { Tenant, RoomStatus } from '../types';

const Tenants: React.FC = () => {
  const { data: tenants, loading, setData: setTenants } = useSupabase<Tenant>('tenants');
  const { isDemo } = useAuth();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, tenant: Tenant | null}>({show: false, tenant: null});
  
  const [rentFilter, setRentFilter] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Notice Period' | 'Left'>('All');

  const handleDeleteClick = (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDemo) {
        alert("Action Restricted: You are in Demo Mode.");
        return;
    }

    if (!tenant.id) {
        alert("Error: Tenant ID is missing.");
        return;
    }

    setDeleteConfirm({show: true, tenant});
  };

  const confirmDelete = async () => {
    const tenant = deleteConfirm.tenant;
    setDeleteConfirm({show: false, tenant: null});
    
    if (!tenant || !tenant.id) return;

    try {
        // Delete tenant (cascade handles payments and complaints)
        const { error: tError, data } = await supabase
          .from('tenants')
          .delete()
          .eq('id', tenant.id)
          .select();
        
        if (tError) throw new Error(`Failed to delete tenant: ${tError.message}`);

        if (!data || data.length === 0) {
            throw new Error("No rows deleted. RLS policy may have blocked the operation.");
        }

        // Free up the room
        if (tenant.roomNumber) {
            const { data: rooms } = await supabase
                .from('rooms')
                .select('id')
                .eq('number', tenant.roomNumber);
            
            if (rooms && rooms.length > 0) {
                 await supabase
                    .from('rooms')
                    .update({ status: RoomStatus.AVAILABLE })
                    .eq('id', rooms[0].id);
            }
        }

        // Update UI
        setTenants(prev => prev.filter(t => t.id !== tenant.id));
        console.log('✅ Tenant deleted successfully');

    } catch (e: any) {
        console.error("Delete failed", e);
        alert(e.message || "Failed to delete tenant. Please check your connection or permissions.");
    }
  };

  const handleToggleRentStatus = async (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDemo) return alert("Rent status cannot be changed in Demo Mode.");
    if (!tenant.id) return;
    
    const newStatus = tenant.rentStatus === 'Paid' ? 'Pending' : 'Paid';

    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, rentStatus: newStatus } : t));

    try {
      if (newStatus === 'Paid') {
          // Record the payment automatically
          await supabase.from('payments').insert({
            tenantId: tenant.id,
            tenantName: tenant.name,
            amount: tenant.rentAmount,
            date: new Date().toISOString().split('T')[0],
            type: 'Rent',
            method: 'Cash'
          });
      }

      const { error } = await supabase
        .from('tenants')
        .update({ rentStatus: newStatus })
        .eq('id', tenant.id);
        
      if (error) throw error;

    } catch (e: any) {
      console.error("Status update failed", e);
    }
  };

const handleInvite = (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation();
    let cleanPhone = tenant.phone ? tenant.phone.replace(/\D/g, '') : '';
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    if (!cleanPhone || cleanPhone.length < 10) {
        alert("Invalid phone number.");
        return;
    }

    // Try to get the actual URL (not blob:)
    let actualUrl = window.location.href;
    
    // If it's a blob URL, try to get the parent frame URL
    if (actualUrl.startsWith('blob:')) {
        try {
            // Try to access parent/top frame URL
            actualUrl = window.top?.location.href || window.parent?.location.href || actualUrl;
        } catch (e) {
            // If we can't access parent due to CORS, extract the domain from blob URL
            const match = actualUrl.match(/blob:(https?:\/\/[^/]+)/);
            if (match) {
                actualUrl = match[1];
            }
        }
    }
    
    // Remove everything after # (hash) to get base URL
    const baseUrl = actualUrl.split('#')[0].split('?')[0].replace(/\/$/, '');
    
    // Construct login URL
    const loginUrl = `${baseUrl}#/login`;
    
    const message = `Hi ${tenant.name},\n\nYou have been added to the SquarePG system.\n\nLogin Link: ${loginUrl}\nUsername: ${tenant.email}\n\nPlease login to view your rent status and raise complaints.\n\n- Management`;
    
    console.log('Actual URL:', actualUrl);
    console.log('Base URL:', baseUrl);
    console.log('Generated login URL:', loginUrl);
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
};



  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.roomNumber.includes(searchTerm) ||
      t.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesRent = rentFilter === 'All' || t.rentStatus === rentFilter;

    return matchesSearch && matchesStatus && matchesRent;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-foreground">Tenants</h1>
           <p className="text-sm text-muted-foreground">Manage active tenants and payments.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-secondary/30 rounded-lg w-fit">
          {['All', 'Paid', 'Pending', 'Overdue'].map((filter) => (
              <button
                key={filter}
                onClick={() => setRentFilter(filter as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    rentFilter === filter 
                    ? 'bg-background shadow text-foreground' 
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                }`}
              >
                  {filter}
              </button>
          ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-secondary/20">
           <div className="relative w-full sm:w-72 group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
             <input 
               type="text" 
               placeholder="Search name, room, phone..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring transition-all"
             />
           </div>
           
           <div className="flex gap-2 w-full sm:w-auto items-center">
             <select 
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value as any)}
                 className="h-9 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-auto"
             >
                 <option value="All">All Status</option>
                 <option value="Active">Active</option>
                 <option value="Notice Period">Notice Period</option>
                 <option value="Left">Left</option>
             </select>
             
             {(statusFilter !== 'All' || rentFilter !== 'All') && (
                 <button 
                    onClick={() => { setStatusFilter('All'); setRentFilter('All'); }} 
                    className="p-2 hover:bg-accent rounded-md text-muted-foreground"
                    title="Clear Filters"
                 >
                     <X className="w-4 h-4" />
                 </button>
             )}
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Room</th>
                <th className="px-6 py-3 font-medium">Rent Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTenants.map((tenant) => (
                <tr 
                    key={tenant.id} 
                    onClick={() => setViewingTenant(tenant)}
                    className="hover:bg-muted/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs">
                        {tenant.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{tenant.name}</span>
                        <span className="text-[10px] text-muted-foreground">{tenant.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#{tenant.roomNumber}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={(e) => handleToggleRentStatus(tenant, e)}
                            title={tenant.rentStatus === 'Paid' ? 'Mark as Pending' : 'Mark as Paid'}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                tenant.rentStatus === 'Paid' ? 'bg-green-500' : 'bg-destructive'
                            }`}
                        >
                            <span className="sr-only">Use setting</span>
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                tenant.rentStatus === 'Paid' ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                        <div className="flex flex-col">
                            <span className={`text-sm font-bold tracking-tight ${
                                tenant.rentStatus === 'Paid' ? 'text-green-600' : 'text-destructive'
                            }`}>
                                {tenant.rentStatus}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                                ₹{tenant.rentAmount?.toLocaleString()}
                            </span>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => handleInvite(tenant, e)}
                          title="Invite"
                          className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingTenant(tenant); }}
                          title="Edit"
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(tenant, e)}
                          title="Delete"
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTenants.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        {loading ? 'Loading...' : 'No tenants found.'}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-background w-full max-w-md rounded-xl shadow-2xl border border-border p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Are you sure you want to delete <strong>{deleteConfirm.tenant.name}</strong>?
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-6">
                    <p className="text-xs text-destructive font-medium mb-1">This will PERMANENTLY delete:</p>
                    <ul className="text-xs text-destructive/80 space-y-1 ml-4 list-disc">
                        <li>The Tenant Record</li>
                        <li>Associated Payment History</li>
                        <li>Associated Complaints</li>
                    </ul>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteConfirm({show: false, tenant: null})}
                        className="flex-1 py-2 border border-border rounded-md hover:bg-accent"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                    >
                        Delete Tenant
                    </button>
                </div>
            </div>
        </div>
      )}

      <AddTenantModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <EditTenantModal 
        isOpen={!!editingTenant} 
        onClose={() => setEditingTenant(null)} 
        tenant={editingTenant}
        onUpdate={() => setEditingTenant(null)}
      />
      <TenantDetailsModal 
        isOpen={!!viewingTenant}
        onClose={() => setViewingTenant(null)}
        tenant={viewingTenant}
      />
    </div>
  );
};

export default Tenants;
