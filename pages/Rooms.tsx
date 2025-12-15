import React, { useState } from 'react';
import { RoomStatus, Room, Tenant } from '../types';
import { BedDouble, Wrench, Filter, Plus, Trash, User, AlertTriangle, UserMinus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import { useOwnerFilter } from '../hooks/useOwnerFilter'; // ADD THIS
import AddRoomModal from '../components/AddRoomModal';

const Rooms: React.FC = () => {
  const { data: roomsRaw, loading: loadingRooms, setData: setRoomsRaw } = useSupabase<any>('rooms');
  const { data: tenants, loading: loadingTenants } = useSupabase<Tenant>('tenants');
  const { isDemo } = useAuth();
  const { ownerId } = useOwnerFilter(); // ADD THIS - to get owner_id for inserts
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RoomStatus | 'All'>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, room: Room | null}>({show: false, room: null});

  const loading = loadingRooms || loadingTenants;

  // Map database format to TypeScript format
  const rooms: Room[] = roomsRaw.map((r: any) => ({
    id: r.id,
    number: r.number,
    type: r.type,
    status: r.status,
    price: r.price,
    floor: r.floor,
    capacity: r.capacity || 1,
    currentOccupancy: r.current_occupancy || 0
  }));

  const setRooms = (updater: (prev: Room[]) => Room[]) => {
    setRoomsRaw((prev: any[]) => {
      const mappedPrev: Room[] = prev.map((r: any) => ({
        id: r.id,
        number: r.number,
        type: r.type,
        status: r.status,
        price: r.price,
        floor: r.floor,
        capacity: r.capacity || 1,
        currentOccupancy: r.current_occupancy || 0
      }));
      
      const updated = updater(mappedPrev);
      
      return updated.map((r: Room) => ({
        id: r.id,
        number: r.number,
        type: r.type,
        status: r.status,
        price: r.price,
        floor: r.floor,
        capacity: r.capacity,
        current_occupancy: r.currentOccupancy
      }));
    });
  };

  const handleDeleteClick = (room: Room) => {
    if (isDemo) {
      alert("Action Restricted: You are in Demo Mode. Cannot delete real data.");
      return;
    }

    if (!room.id) {
      alert("Error: Room ID is missing.");
      return;
    }
    
    const activeTenants = getOccupants(room.number);
    
    if (activeTenants.length > 0) {
      alert(`Cannot Delete Room ${room.number}\n\nIt is currently occupied by:\n${activeTenants.map(t => `- ${t.name}`).join('\n')}\n\nPlease unassign or delete these tenants first.`);
      return;
    }

    setDeleteConfirm({show: true, room});
  };

  const confirmDelete = async () => {
    const room = deleteConfirm.room;
    setDeleteConfirm({show: false, room: null});
    
    if (!room || !room.id) return;

    const previousRooms = [...rooms];
    setRooms(prev => prev.filter(r => r.id !== room.id));

    try {
      const { error, data } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id)
        .eq('owner_id', ownerId) // ADD THIS - ensure deleting only own rooms
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Room not found or you don't have permission to delete it.");

      console.log('✅ Room deleted successfully');
    } catch (error: any) {
      console.error("Error deleting room:", error);
      setRooms(() => previousRooms);
      alert(`Failed to delete room: ${error.message}`);
    }
  };

  const handleToggleStatus = async (id: string | number, room: Room) => {
    if (isDemo) {
      alert("Demo Mode: Cannot change room status.");
      return;
    }

    const currentOccupancy = room.currentOccupancy || 0;
    
    if (currentOccupancy > 0) {
      alert(`This room has ${currentOccupancy} tenant(s). Please unassign them first.`);
      return;
    }
    
    const newStatus = room.status === RoomStatus.AVAILABLE ? RoomStatus.MAINTENANCE : RoomStatus.AVAILABLE;
    
    setRooms(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));

    try {
      // ADD owner_id filter to update
      await supabase
        .from('rooms')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('owner_id', ownerId);
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert on error
      setRooms(prev => prev.map(r => r.id === id ? { ...r, status: room.status } : r));
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (filterStatus === 'All') return true;
    return room.status === filterStatus;
  });

  const getOccupants = (roomNumber: string): Tenant[] => {
    if (!tenants) return [];
    return tenants.filter(t => 
      String(t.roomNumber).trim() === String(roomNumber).trim() && 
      t.status !== 'Left'
    );
  };

  const getRoomStatusColor = (room: Room) => {
    const occupancy = room.currentOccupancy || 0;
    const capacity = room.capacity || 1;
    
    if (room.status === RoomStatus.MAINTENANCE) return 'bg-yellow-500';
    if (occupancy === 0) return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
    if (occupancy >= capacity) return 'bg-destructive';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Rooms</h1>
          <p className="text-sm text-muted-foreground">Occupancy status and room management.</p>
        </div>
        <div className="flex gap-2 relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-3 py-2 bg-background border rounded-md text-sm font-medium transition-colors ${filterStatus !== 'All' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          >
            <Filter className="w-4 h-4" /> 
            {filterStatus === 'All' ? 'Filter' : filterStatus}
          </button>
          
          {isFilterOpen && (
            <div className="absolute top-12 left-0 z-10 w-40 bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
              {['All', RoomStatus.AVAILABLE, RoomStatus.OCCUPIED, RoomStatus.MAINTENANCE].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status as any);
                    setIsFilterOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {status}
                </button>
              ))}
            </div>
          )}

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading && <div className="col-span-full text-center py-10 text-muted-foreground">Loading rooms...</div>}
        
        {!loading && filteredRooms.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No rooms found. Add your first room to get started!
          </div>
        )}
        
        {filteredRooms.map((room) => {
          const occupants = getOccupants(room.number);
          const occupancy = room.currentOccupancy || 0;
          const capacity = room.capacity || 1;
          const isPartiallyOccupied = occupancy > 0 && occupancy < capacity;

          return (
            <div key={room.id} className="bg-card rounded-xl border border-border shadow-sm hover:border-primary/50 transition-all group overflow-hidden relative flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                <div className={`w-2 h-2 rounded-full ${getRoomStatusColor(room)}`}></div>
              </div>
              
              <div className="p-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                    {capacity > 1 ? <Users className="w-5 h-5" /> : <BedDouble className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground font-mono text-lg">{room.number}</h3>
                    <p className="text-xs text-muted-foreground">{room.type}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium text-foreground font-mono">₹{room.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Floor</span>
                    <span className="font-medium text-foreground">{room.floor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Occupancy</span>
                    <span className={`font-medium font-mono ${
                      occupancy === 0 ? 'text-green-600' :
                      occupancy >= capacity ? 'text-destructive' :
                      'text-blue-600'
                    }`}>
                      {occupancy}/{capacity}
                      {isPartiallyOccupied && <span className="text-[10px] ml-1">(Space Available)</span>}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t border-border/50 mt-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">
                      Tenants {occupancy > 0 && `(${occupancy})`}
                    </p>
                    
                    {occupancy > 0 ? (
                      occupants.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {occupants.map(occ => (
                            <div key={occ.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary text-secondary-foreground">
                              <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center shrink-0 border border-border">
                                <span className="text-[10px] font-bold">{occ.name.charAt(0)}</span>
                              </div>
                              <span className="text-xs font-medium truncate" title={occ.name}>
                                {occ.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-destructive text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Data Mismatch</span>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        {room.status === RoomStatus.MAINTENANCE ? 'Under Maintenance' : 'Empty - Available'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-secondary/30 px-5 py-3 border-t border-border flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Actions</span>
                <div className="flex gap-2">
                  {occupancy === 0 && (
                    <button 
                      onClick={() => handleToggleStatus(room.id!, room)}
                      title={room.status === RoomStatus.AVAILABLE ? "Mark Maintenance" : "Mark Available"}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteClick(room)}
                    title="Delete Room"
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    type="button"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {!loading && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary transition-all h-full min-h-[320px]"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-2xl font-light leading-none">+</span>
            </div>
            <span className="text-sm font-medium">Add Room</span>
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-sm rounded-xl shadow-2xl border border-border p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete Room <strong>{deleteConfirm.room.number}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm({show: false, room: null})}
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

      <AddRoomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default Rooms;
