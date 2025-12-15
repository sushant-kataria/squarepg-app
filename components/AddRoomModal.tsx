import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoomType, RoomStatus } from '../types';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddRoomModal: React.FC<AddRoomModalProps> = ({ isOpen, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    number: '',
    type: RoomType.SINGLE,
    price: '',
    floor: '',
    status: RoomStatus.AVAILABLE
  });

  useEffect(() => {
    if (isOpen) {
      fetchCurrentUser();
      // Reset form
      setFormData({
        number: '',
        type: RoomType.SINGLE,
        price: '',
        floor: '',
        status: RoomStatus.AVAILABLE
      });
      setError('');
    }
  }, [isOpen]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Error getting user:', userError);
        setError('Unable to fetch user. Please log in again.');
        return;
      }

      console.log('✅ Current owner ID:', user.id);
      setCurrentOwnerId(user.id);
    } catch (err) {
      console.error('❌ Error fetching current user:', err);
      setError('Failed to authenticate user');
    }
  };

  if (!isOpen) return null;

  // Calculate capacity based on room type
  const getCapacity = (type: RoomType): number => {
    switch(type) {
      case RoomType.SINGLE: 
        return 1;
      case RoomType.DOUBLE: 
        return 2;
      case RoomType.TRIPLE: 
        return 3;
      default: 
        return 1;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      if (!currentOwnerId) {
        throw new Error('Owner ID not found. Please refresh and try again.');
      }

      const capacity = getCapacity(formData.type);
      
      // Log for debugging
      console.log('📝 Creating room with:', {
        number: formData.number,
        type: formData.type,
        capacity: capacity,
        price: Number(formData.price),
        floor: Number(formData.floor),
        status: formData.status,
        owner_id: currentOwnerId
      });
      
      const { data, error } = await supabase.from('rooms').insert({
        number: formData.number,
        type: formData.type,
        price: Number(formData.price),
        floor: Number(formData.floor),
        status: formData.status,
        capacity: capacity,
        current_occupancy: 0,
        owner_id: currentOwnerId  // ✅ Set owner_id
      }).select();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Room created successfully:', data);
      
      alert(`✅ Room ${formData.number} has been created successfully!`);
      
      // Reset form and close
      setFormData({
        number: '',
        type: RoomType.SINGLE,
        price: '',
        floor: '',
        status: RoomStatus.AVAILABLE
      });
      
      onClose();
      window.location.reload(); // Refresh to show new room
      
    } catch (error: any) {
      console.error("❌ Failed to add room", error);
      setError(error.message || 'Failed to add room');
      alert(`Error adding room: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-md rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Add New Room</h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">
                Room Number *
              </label>
              <input 
                required
                type="text"
                value={formData.number}
                onChange={e => setFormData({...formData, number: e.target.value})}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. 204"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">
                Floor *
              </label>
              <input 
                required
                type="number"
                min="0"
                value={formData.floor}
                onChange={e => setFormData({...formData, floor: e.target.value})}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. 2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">
              Room Type *
            </label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as RoomType})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              <option value={RoomType.SINGLE}>Single (1 Person)</option>
              <option value={RoomType.DOUBLE}>Double (2 People)</option>
              <option value={RoomType.TRIPLE}>Triple (3 People)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">
              Capacity is automatically set: Single=1, Double=2, Triple=3
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">
              Price (₹/month) *
            </label>
            <input 
              required
              type="number"
              min="0"
              step="100"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="e.g. 15000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">
              Initial Status *
            </label>
            <select 
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as RoomStatus})}
              className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              <option value={RoomStatus.AVAILABLE}>Available</option>
              <option value={RoomStatus.OCCUPIED}>Occupied</option>
              <option value={RoomStatus.MAINTENANCE}>Maintenance</option>
            </select>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting || !currentOwnerId}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin"/>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Room
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddRoomModal;
