import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoomStatus, Room } from '../types';

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTenantModal: React.FC<AddTenantModalProps> = ({ isOpen, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    roomNumber: '',
    phone: '',
    email: '',
    rentAmount: '',
    joinDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen) {
        fetchAvailableRooms();
    }
  }, [isOpen]);

  const fetchAvailableRooms = async () => {
      setLoadingRooms(true);
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', RoomStatus.AVAILABLE);
      
      if (data) {
          setAvailableRooms(data);
      }
      setLoadingRooms(false);
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomNumber) {
        alert("Please select a room.");
        return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert Tenant
      const { error: tenantError } = await supabase.from('tenants').insert({
        name: formData.name,
        roomNumber: formData.roomNumber,
        phone: formData.phone,
        email: formData.email,
        rentAmount: Number(formData.rentAmount),
        joinDate: formData.joinDate,
        status: 'Active',
        rentStatus: 'Pending'
      });
      if (tenantError) throw tenantError;

      // 2. Update Room Status (Find room by number string)
      // Note: roomNumber in tenants is text, number in rooms is text.
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('number', formData.roomNumber)
        .limit(1);

      if (rooms && rooms.length > 0) {
        await supabase
            .from('rooms')
            .update({ status: RoomStatus.OCCUPIED })
            .eq('id', rooms[0].id);
      }

      onClose();
      setFormData({
        name: '',
        roomNumber: '',
        phone: '',
        email: '',
        rentAmount: '',
        joinDate: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error("Failed to add tenant", error);
      alert(`Error adding tenant: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-md rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Add New Tenant</h3>
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
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Room</label>
              <select 
                required
                value={formData.roomNumber}
                onChange={e => {
                    const selectedRoom = availableRooms.find(r => r.number === e.target.value);
                    setFormData({
                        ...formData, 
                        roomNumber: e.target.value,
                        rentAmount: selectedRoom ? selectedRoom.price.toString() : formData.rentAmount
                    });
                }}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                  <option value="">Select Room</option>
                  {loadingRooms && <option disabled>Loading rooms...</option>}
                  {!loadingRooms && availableRooms.length === 0 && <option disabled>No Available Rooms</option>}
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
                placeholder="e.g. 12000"
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
              placeholder="e.g. 919876543210"
            />
            <p className="text-[10px] text-muted-foreground">Required for WhatsApp reminders. Do not add + sign.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
            <input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="john@example.com"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'Saving...' : 'Save Tenant'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTenantModal;