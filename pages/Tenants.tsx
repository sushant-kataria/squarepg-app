import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, Trash2, UserPlus, X, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import AddTenantModal from '../components/AddTenantModal';
import EditTenantModal from '../components/EditTenantModal';
import TenantDetailsModal from '../components/TenantDetailsModal';
import { Tenant, RoomStatus } from '../types';
import { createInvitation, generateInvitationLink } from '../lib/invitations';

const Tenants: React.FC = () => {
  const { data: tenants, loading, setData: setTenants } = useSupabase<Tenant>('tenants');
  const { isDemo } = useAuth();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, tenant: Tenant | null}>({show: false, tenant: null});
  const [settingsData, setSettingsData] = useState<any>(null);
  
  const [rentFilter, setRentFilter] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Notice Period' | 'Left'>('All');

  // Fetch settings for PG name and manager details
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();
        
        if (!error && data) {
          setSettingsData(data);
          console.log('⚙️ Settings loaded:', data);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchSettings();
  }, []);

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
      console.log('🗑️ Deleting tenant:', {
        id: tenant.id,
        name: tenant.name,
        roomNumber: tenant.roomNumber
      });

      // FIRST: Decrease room occupancy BEFORE deleting tenant
      if (tenant.roomNumber) {
        console.log('📉 Decreasing room occupancy for room:', tenant.roomNumber);
        
        const { data: roomData, error: roomFetchError } = await supabase
          .from('rooms')
          .select('*')
          .eq('number', tenant.roomNumber)
          .maybeSingle();
        
        if (roomFetchError) {
          console.error('Error fetching room:', roomFetchError);
        } else if (roomData) {
          const currentOccupancy = roomData.current_occupancy || 0;
          const newOccupancy = Math.max(0, currentOccupancy - 1);
          const capacity = roomData.capacity || 1;
          
          // Determine new status
          const newStatus = newOccupancy === 0 
            ? RoomStatus.AVAILABLE 
            : newOccupancy >= capacity 
              ? RoomStatus.OCCUPIED 
              : RoomStatus.AVAILABLE;
          
          console.log(`Room ${tenant.roomNumber}: ${currentOccupancy} → ${newOccupancy}, status: ${newStatus}`);
          
          const { error: roomUpdateError } = await supabase
            .from('rooms')
            .update({ 
              current_occupancy: newOccupancy,
              status: newStatus
            })
            .eq('id', roomData.id);
          
          if (roomUpdateError) {
            console.error('Error updating room:', roomUpdateError);
            throw new Error(`Failed to update room: ${roomUpdateError.message}`);
          }
          
          console.log('✅ Room occupancy updated successfully');
        }
      }

      // THEN: Delete tenant (cascade will delete payments and complaints)
      console.log('🗑️ Deleting tenant record...');
      
      const { error: deleteError, data: deletedData } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenant.id)
        .select();
      
      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error(`Failed to delete tenant: ${deleteError.message}`);
      }

      if (!deletedData || deletedData.length === 0) {
        throw new Error("No rows deleted. RLS policy may have blocked the operation.");
      }

      console.log('✅ Tenant deleted successfully:', deletedData);

      // Update UI - remove from list
      setTenants(prev => prev.filter(t => t.id !== tenant.id));
      
      alert(`✅ ${tenant.name} has been deleted successfully.`);

    } catch (e: any) {
      console.error("❌ Delete failed:", e);
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

  const handleInvite = async (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDemo) {
      alert("Action Restricted: You are in Demo Mode.");
      return;
    }
  
    if (!tenant.id) {
      alert("Error: Tenant ID is missing.");
      return;
    }
  
    // Validate phone number first
    let cleanPhone = tenant.phone ? tenant.phone.replace(/\D/g, '') : '';
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
  
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("❌ Invalid phone number. Please update the tenant's phone number first.");
      return;
    }
  
    try {
      console.log('📧 Starting invitation process for:', {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: cleanPhone
      });

      // Check if there's a recent invitation
      const { data: recentInvite, error: checkError } = await supabase
        .from('invitations')
        .select('created_at, is_accepted')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking recent invitations:', checkError);
      }

      if (recentInvite && !recentInvite.is_accepted) {
        const inviteTime = new Date(recentInvite.created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (inviteTime > oneHourAgo) {
          const minutesAgo = Math.floor((Date.now() - inviteTime.getTime()) / 60000);
          alert(
            `⏰ An invitation was sent ${minutesAgo} minute(s) ago.\n\n` +
            `Please wait ${60 - minutesAgo} more minute(s) before sending another invitation.\n\n` +
            `The tenant should check their email for the existing invitation link.`
          );
          return;
        }
      }

      console.log('📧 Creating invitation...');

      // Create invitation
      const invitation = await createInvitation(
        tenant.id,
        tenant.email,
        tenant.name
      );
      
      console.log('✅ Invitation created:', invitation);
      
      const inviteLink = generateInvitationLink(invitation.token);
      console.log('🔗 Invitation link:', inviteLink);

      // Construct WhatsApp message
      const pgName = settingsData?.pgName || 'AshirwadPG';
      const managerName = settingsData?.managerName || 'Property Manager';
      const managerPhone = settingsData?.managerPhone || '';

      const message = 
`Hi ${tenant.name}! 👋

Welcome to *${pgName}*!

🏠 *Your Room Details:*
Room Number: *${tenant.roomNumber || 'TBA'}*
Monthly Rent: *₹${tenant.rentAmount.toLocaleString()}*

📱 *Setup Your Tenant Account:*
Click this link to activate your account:
${inviteLink}

⏰ This link expires in 7 days.

For any queries, contact:
${managerName}${managerPhone ? `\n📞 ${managerPhone}` : ''}`;

      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      console.log('📱 Opening WhatsApp for:', cleanPhone);
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      
      // Show success message
      setTimeout(() => {
        alert(
          `✅ Invitation created successfully!\n\n` +
          `📱 WhatsApp should open with the message.\n\n` +
          `If WhatsApp didn't open, share this link:\n${inviteLink}`
        );
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Error creating invitation:', error);
      alert(`❌ Failed to create invitation.\n\nError: ${error.message}\n\nPlease try again.`);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.roomNumber && t.roomNumber.includes(searchTerm)) ||
      (t.phone && t.phone.includes(searchTerm));
    
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
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{tenant.name}</span>
                        <span className="text-[10px] text-muted-foreground">{tenant.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    #{tenant.roomNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => handleToggleRentStatus(tenant, e)}
                        title={tenant.rentStatus === 'Paid' ? 'Mark as Pending' : 'Mark as Paid'}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          tenant.rentStatus === 'Paid' ? 'bg-green-500' : 'bg-destructive'
                        }`}
                      >
                        <span className="sr-only">Toggle rent status</span>
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
                      {/* Invite Button - Green WhatsApp Icon */}
                      <button 
                        onClick={(e) => handleInvite(tenant, e)}
                        title="Send WhatsApp Invitation"
                        className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      
                      {/* Edit Button - Orange */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingTenant(tenant); }}
                        title="Edit Tenant"
                        className="p-2 text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      {/* Delete Button - Red */}
                      <button 
                        onClick={(e) => handleDeleteClick(tenant, e)}
                        title="Delete Tenant"
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
                <li>Associated Invitations</li>
              </ul>
              {deleteConfirm.tenant.roomNumber && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-destructive/20">
                  Room #{deleteConfirm.tenant.roomNumber} occupancy will be decreased
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm({show: false, tenant: null})}
                className="flex-1 py-2 border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                Delete Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTenantModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

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
