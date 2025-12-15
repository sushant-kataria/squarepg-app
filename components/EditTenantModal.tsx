import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoomStatus, Room, Tenant } from '../types';

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onUpdate: () => void;
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
            roomNumber: tenant.roomNumber || '',
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
      const { data } = await supabase.from('rooms').select('*');
      
      if (data) {
          // Map database format (snake_case) to TypeScript format (camelCase)
          const mappedRooms: Room[] = data.map((r: any) => ({
              id: r.id,
              number: r.number,
              type: r.type,
              status: r.status,
              price: r.price,
              floor: r.floor,
              capacity: r.capacity || 1,
              currentOccupancy: r.current_occupancy || 0
          }));

          // Filter rooms that have space OR are the current tenant's room
          const filtered = mappedRooms.filter(r => {
              const isCurrentRoom = tenant && String(r.number) === String(tenant.roomNumber);
              const hasSpace = r.currentOccupancy < r.capacity;
              const isAvailableStatus = r.status === RoomStatus.AVAILABLE || r.status === RoomStatus.OCCUPIED;
              
              return isCurrentRoom || (hasSpace && isAvailableStatus);
          });
          setAvailableRooms(filtered);
      }
      setLoadingRooms(false);
  };

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const oldRoomNumber = tenant.roomNumber;
      const newRoomNumber = formData.roomNumber;

      // Handle Room Occupancy Changes
      if (newRoomNumber !== oldRoomNumber) {
          // Decrease occupancy of old room
          if (oldRoomNumber) {
              const { data: oldRoomData } = await supabase
                .from('rooms')
                .select('*')
                .eq('number', oldRoomNumber)
                .maybeSingle();
                
              if (oldRoomData) {
                  const newOccupancy = Math.max(0, (oldRoomData.current_occupancy || 0) - 1);
                  const capacity = oldRoomData.capacity || 1;
                  const newStatus = newOccupancy === 0 ? RoomStatus.AVAILABLE : 
                                   newOccupancy >= capacity ? RoomStatus.OCCUPIED : 
                                   RoomStatus.AVAILABLE;
                  
                  await supabase
                    .from('rooms')
                    .update({ 
                        current_occupancy: newOccupancy,
                        status: newStatus
                    })
                    .eq('id', oldRoomData.id);
              }
          }

          // Increase occupancy of new room
          if (newRoomNumber) {
              const { data: newRoomData } = await supabase
                .from('rooms')
                .select('*')
                .eq('number', newRoomNumber)
                .maybeSingle();

              if (newRoomData) {
                  const newOccupancy = (newRoomData.current_occupancy || 0) + 1;
                  const capacity = newRoomData.capacity || 1;
                  const newStatus = newOccupancy >= capacity ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE;
                  
                  await supabase
                    .from('rooms')
                    .update({ 
                        current_occupancy: newOccupancy,
                        status: newStatus
                    })
                    .eq('id', newRoomData.id);
              }
          }
      }

      // Update Tenant
      const { error } = await supabase.from('tenants').update({
        name: formData.name,
        roomNumber: formData.roomNumber || null,
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
                        rentAmount: selectedRoom ? selectedRoom.price.toString() : formData.rentAmount
                    });
                }}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                  <option value="">Unassign (No Room)</option>
                  {loadingRooms && <option disabled>Loading...</option>}
                  {availableRooms.map(room => {
                      const occupancy = room.currentOccupancy || 0;
                      const capacity = room.capacity || 1;
                      const isCurrent = tenant && String(room.number) === String(tenant.roomNumber);
                      
                      return (
                          <option key={room.id} value={room.number}>
                              {room.number} - {room.type} ({occupancy}/{capacity}) - ₹{room.price}
                              {isCurrent ? ' (Current)' : ''}
                          </option>
                      );
                  })}
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
          <label className="text-xs font-medium text-muted-foreground uppercase">
            Phone Number
          </label>
          <input 
            required
            type="tel"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            placeholder="9876543210"
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
