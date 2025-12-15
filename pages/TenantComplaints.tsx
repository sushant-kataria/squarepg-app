import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Complaint } from '../types';
import { MessageSquare, Plus, AlertCircle, Loader2, X, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TenantComplaints: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const { isDemo } = useAuth();
  const [newComplaint, setNewComplaint] = useState({
    title: '',
    description: '',
    priority: 'Medium'
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const userEmail = localStorage.getItem('pg_user_email');
      const { data: { user } } = await supabase.auth.getUser();

      let tenantQuery = supabase
        .from('tenants')
        .select('id');

      if (user?.id) {
        tenantQuery = tenantQuery.eq('auth_user_id', user.id);
      } else if (userEmail) {
        tenantQuery = tenantQuery.eq('email', userEmail.toLowerCase().trim());
      }

      const { data: tenant, error: tenantError } = await tenantQuery.maybeSingle();

      if (tenantError || !tenant) {
        console.error('❌ Error fetching tenant:', tenantError);
        setLoading(false);
        return;
      }

      setTenantId(tenant.id);

      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select('*')
        .eq('tenantId', tenant.id)
        .order('created_at', { ascending: false });

      if (!complaintsError) {
        setComplaints(complaintsData || []);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemo) {
      alert("Demo Mode: Cannot submit complaints in demo mode.");
      return;
    }

    if (!tenantId) {
      alert("Error: Tenant ID not found. Please refresh and try again.");
      return;
    }
    
    try {
      const { error } = await supabase.from('complaints').insert({
        tenantId: tenantId,
        title: newComplaint.title,
        description: newComplaint.description,
        priority: newComplaint.priority,
        status: 'Pending'
      });

      if (error) throw error;

      setShowAddModal(false);
      setNewComplaint({ title: '', description: '', priority: 'Medium' });
      fetchComplaints();
    } catch (error: any) {
      console.error('Error submitting complaint:', error);
      alert(`Failed to submit complaint: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading complaints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold break-words">My Complaints</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Report and track issues</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors flex-shrink-0 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" />
          New Complaint
        </button>
      </div>

      {complaints.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No complaints filed</p>
          <p className="text-xs mt-1">Click "New Complaint" to report an issue</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {complaints.map((complaint) => (
            <div key={complaint.id} className="bg-card p-4 sm:p-5 rounded-lg border border-border hover:border-primary/30 transition-colors">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    complaint.status === 'Resolved' 
                      ? 'bg-green-500/10' 
                      : complaint.status === 'In Progress'
                      ? 'bg-blue-500/10'
                      : 'bg-orange-500/10'
                  }`}>
                    <AlertCircle className={`w-5 h-5 ${
                      complaint.status === 'Resolved' 
                        ? 'text-green-600' 
                        : complaint.status === 'In Progress'
                        ? 'text-blue-600'
                        : 'text-orange-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base break-words">{complaint.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">{complaint.description}</p>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-2 items-start sm:items-end">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    complaint.status === 'Resolved' 
                      ? 'bg-green-100 text-green-700' :
                    complaint.status === 'In Progress' 
                      ? 'bg-blue-100 text-blue-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {complaint.status || 'Pending'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    complaint.priority === 'High' 
                      ? 'bg-red-100 text-red-700' : 
                    complaint.priority === 'Medium' 
                      ? 'bg-orange-100 text-orange-700' : 
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {complaint.priority}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                Submitted: {complaint.created_at 
                  ? new Date(complaint.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Unknown date'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Complaint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background w-full max-w-md rounded-xl p-4 sm:p-6 border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Submit Complaint</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={newComplaint.title}
                  onChange={(e) => setNewComplaint({...newComplaint, title: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  placeholder="Brief description of the issue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({...newComplaint, description: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  rows={4}
                  placeholder="Provide more details about the issue..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={newComplaint.priority}
                  onChange={(e) => setNewComplaint({...newComplaint, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantComplaints;
