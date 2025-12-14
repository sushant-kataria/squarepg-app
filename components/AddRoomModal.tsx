import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoomType, RoomStatus } from '../types';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddRoomModal: React.FC<AddRoomModalProps> = ({ isOpen, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    type: RoomType.SINGLE,
    price: '',
    floor: '',
    status: RoomStatus.AVAILABLE
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('rooms').insert({
        number: formData.number,
        type: formData.type,
        price: Number(formData.price),
        floor: Number(formData.floor),
        status: formData.status
      });
      if (error) throw error;
      
      onClose();
      setFormData({
        number: '',
        type: RoomType.SINGLE,
        price: '',
        floor: '',
        status: RoomStatus.AVAILABLE
      });
    } catch (error: any) {
      console.error("Failed to add room", error);
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Room Number</label>
              <input 
                required
                type="text"
                value={formData.number}
                onChange={e => setFormData({...formData, number: e.target.value})}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="e.g. 204"
              />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-medium text-muted-foreground uppercase">Floor</label>
              <input 
                required
                type="number"
                value={formData.floor}
                onChange={e => setFormData({...formData, floor: e.target.value})}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="e.g. 2"
              />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-medium text-muted-foreground uppercase">Room Type</label>
             <select 
               value={formData.type}
               onChange={e => setFormData({...formData, type: e.target.value as RoomType})}
               className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
             >
                <option value={RoomType.SINGLE}>Single</option>
                <option value={RoomType.DOUBLE}>Double</option>
                <option value={RoomType.TRIPLE}>Triple</option>
             </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Price (₹/month)</label>
            <input 
                required
                type="number"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="e.g. 15000"
            />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-medium text-muted-foreground uppercase">Initial Status</label>
             <select 
               value={formData.status}
               onChange={e => setFormData({...formData, status: e.target.value as RoomStatus})}
               className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
             >
                <option value={RoomStatus.AVAILABLE}>Available</option>
                <option value={RoomStatus.OCCUPIED}>Occupied</option>
                <option value={RoomStatus.MAINTENANCE}>Maintenance</option>
             </select>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'Saving...' : 'Save Room'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddRoomModal;