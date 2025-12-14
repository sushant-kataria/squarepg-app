import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoomStatus, Room, Tenant } from '../types';

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onUpdate: () => void; // Trigger refresh parent
}

const EditTenantModal: React.FC<EditTenantModalProps> = ({ isOpen, onClose, tenant, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    roomNumber: '',
    phone: '',
    email: '',
    rentAmount: '',
    joinDate: ''
  });

  useEffect(() => {
    if (isOpen && tenant) {
        setFormData({
            name: tenant.name,
            roomNumber: tenant.roomNumber || '', // Handle null/undefined
            phone: tenant.phone,
            email: tenant.email,
            rentAmount: tenant.rentAmount.toString(),
            joinDate: tenant.joinDate
        });
        fetchRooms();
    }
  }, [isOpen, tenant]);

  const fetchRooms = async () => {
      setLoadingRooms(true);
      // Fetch Available rooms OR the current room of the tenant (so it appears in list)
      const { data } = await supabase
        .from('rooms')
        .select('*');
      
      if (data) {
          // Filter: Available OR matches current tenant's room
          const filtered = data.filter(r => 
              r.status === RoomStatus.AVAILABLE || 
              (tenant && String(r.number) === String(tenant.roomNumber))
          );
          setAvailableRooms(filtered);
      }
      setLoadingRooms(false);
  }

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const oldRoomNumber = tenant.roomNumber;
      const newRoomNumber = formData.roomNumber;

      // 1. Handle Room Status Changes
      if (newRoomNumber !== oldRoomNumber) {
          // A. If they moved OUT of an old room, mark it AVAILABLE
          if (oldRoomNumber) {
              const { data: oldRoom } = await supabase
                .from('rooms')
                .select('id')
                .eq('number', oldRoomNumber)
                .maybeSingle();
                
              if (oldRoom) {
                  await supabase.from('rooms').update({ status: RoomStatus.AVAILABLE }).eq('id', oldRoom.id);
              }
          }

          // B. If they moved INTO a new room, mark it OCCUPIED
          if (newRoomNumber) {
              const { data: newRoom } = await supabase
                .from('rooms')
                .select('id')
                .eq('number', newRoomNumber)
                .maybeSingle();

              if (newRoom) {
                  await supabase.from('rooms').update({ status: RoomStatus.OCCUPIED }).eq('id', newRoom.id);
              }
          }
      }

      // 2. Update Tenant
      const { error } = await supabase.from('tenants').update({
        name: formData.name,
        roomNumber: formData.roomNumber || null, // Send null if empty
        phone: formData.phone,
        email: formData.email,
        rentAmount: Number(formData.rentAmount),
        joinDate: formData.joinDate
      }).eq('id', tenant.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error("Failed to update tenant", error);
      alert(`Error updating tenant: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-md rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Edit Tenant Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Full Name</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Room</label>
              <select 
                value={formData.roomNumber}
                onChange={e => {
                    const selectedRoom = availableRooms.find(r => String(r.number) === e.target.value);
                    setFormData({
                        ...formData, 
                        roomNumber: e.target.value,
                        // Optionally auto-update price if they select a room (and not unassigning)
                        rentAmount: selectedRoom ? selectedRoom.price.toString() : formData.rentAmount
                    });
                }}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                  <option value="">Unassign (No Room)</option>
                  {loadingRooms && <option disabled>Loading...</option>}
                  {availableRooms.map(room => (
                      <option key={room.id} value={room.number}>
                          {room.number} ({room.type} - ₹{room.price})
                      </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Rent Amount (₹)</label>
              <input 
                required
                type="number"
                value={formData.rentAmount}
                onChange={e => setFormData({...formData, rentAmount: e.target.value})}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Phone Number</label>
            <input 
              required
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
            <input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
            Update Tenant
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditTenantModal;