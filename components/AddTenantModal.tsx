import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, User, Phone, Mail, Home, Calendar, IndianRupee } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);

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
      console.log('📂 Add Tenant Modal Opened');
      fetchRooms();
      // Reset form
      setFormData({
        name: '',
        roomNumber: '',
        phone: '',
        email: '',
        rentAmount: '',
        joinDate: new Date().toISOString().split('T')[0]
      });
      setError('');
    }
  }, [isOpen]);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Error getting user:', userError);
        setError('Unable to fetch user. Please log in again.');
        setLoadingRooms(false);
        return;
      }

      console.log('🔍 Fetching rooms for owner:', user.id);
      setCurrentOwnerId(user.id);

      // Fetch rooms filtered by owner_id
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('owner_id', user.id)  // ✅ Filter by current owner
        .order('number', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching rooms:', error);
        throw error;
      }
      
      if (data) {
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

        // Filter rooms with available space
        const filtered = mappedRooms.filter(r => {
          const hasSpace = r.currentOccupancy < r.capacity;
          const isValidStatus = [RoomStatus.AVAILABLE, RoomStatus.OCCUPIED].includes(r.status);
          return hasSpace && isValidStatus;
        });
        
        console.log('🏠 Available rooms for owner:', filtered.length);
        setAvailableRooms(filtered);
      }
    } catch (err: any) {
      console.error('❌ Error fetching rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      console.log('💾 Adding new tenant:', formData);

      // Validate
      if (!formData.name || !formData.email || !formData.phone) {
        throw new Error('Please fill in all required fields');
      }

      if (!currentOwnerId) {
        throw new Error('Owner ID not found. Please refresh and try again.');
      }

      // Insert tenant with owner_id
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.name.trim(),
          roomNumber: formData.roomNumber || null,
          phone: formData.phone.trim(),
          email: formData.email.toLowerCase().trim(),
          rentAmount: Number(formData.rentAmount) || 0,
          joinDate: formData.joinDate,
          rentStatus: 'Pending',
          status: 'Active',
          owner_id: currentOwnerId  // ✅ Set owner_id
        })
        .select()
        .single();

      if (tenantError) {
        console.error('❌ Error adding tenant:', tenantError);
        throw tenantError;
      }

      console.log('✅ Tenant added:', newTenant);

      // Update room occupancy if room is assigned
      if (formData.roomNumber) {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('number', formData.roomNumber)
          .eq('owner_id', currentOwnerId)  // ✅ Ensure room belongs to owner
          .maybeSingle();

        if (roomError) {
          console.error('❌ Error fetching room:', roomError);
        } else if (roomData) {
          const newOccupancy = (roomData.current_occupancy || 0) + 1;
          const capacity = roomData.capacity || 1;
          const newStatus = newOccupancy >= capacity 
            ? RoomStatus.OCCUPIED 
            : RoomStatus.AVAILABLE;

          await supabase
            .from('rooms')
            .update({
              current_occupancy: newOccupancy,
              status: newStatus
            })
            .eq('id', roomData.id);

          console.log(`✅ Room ${formData.roomNumber} occupancy updated: ${newOccupancy}/${capacity}`);
        }
      }

      alert(`✅ ${formData.name} has been added successfully!`);
      onClose();
      window.location.reload(); // Refresh the page to show new tenant

    } catch (error: any) {
      console.error('❌ Failed to add tenant:', error);
      setError(error.message || 'Failed to add tenant');
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-md rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Add New Tenant</h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <User className="w-3 h-3" />
              Full Name *
            </label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email Address *
            </label>
            <input 
              required
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="john@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Phone Number *
            </label>
            <input 
              required
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="9876543210"
              maxLength={15}
            />
          </div>

          {/* Room and Rent */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <Home className="w-3 h-3" />
                Room
              </label>
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
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
              >
                <option value="">No Room</option>
                {loadingRooms ? (
                  <option disabled>Loading...</option>
                ) : availableRooms.length === 0 ? (
                  <option disabled>No rooms available</option>
                ) : (
                  availableRooms.map(room => (
                    <option key={room.id} value={room.number}>
                      #{room.number} ({room.currentOccupancy}/{room.capacity})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                Rent (₹)
              </label>
              <input 
                required
                type="number"
                min="0"
                step="100"
                value={formData.rentAmount}
                onChange={e => setFormData({...formData, rentAmount: e.target.value})}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="15000"
              />
            </div>
          </div>

          {/* Join Date */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Join Date
            </label>
            <input 
              required
              type="date"
              value={formData.joinDate}
              onChange={e => setFormData({...formData, joinDate: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <button 
            type="submit" 
            disabled={isSubmitting || loadingRooms}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding Tenant...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Add Tenant
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTenantModal;
