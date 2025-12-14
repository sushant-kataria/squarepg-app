import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, AlertCircle, CheckCircle, CreditCard, Loader2, Info } from 'lucide-react';
import { Tenant, Complaint } from '../types';

const TenantDashboard: React.FC = () => {
  const { user } = useAuth();
  const email = localStorage.getItem('pg_user_email') || user?.email;
  const isDemo = email === 'demo@squarepg.com';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isComplaintFormOpen, setIsComplaintFormOpen] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');

  useEffect(() => {
    const fetchData = async () => {
        if (!email) {
            setLoading(false);
            return;
        }

        if (isDemo) {
            setTenant({
                id: 999,
                name: 'Demo Tenant',
                roomNumber: '101',
                status: 'Active',
                rentStatus: 'Pending',
                rentAmount: 12000,
                phone: '9876543210',
                email: 'demo@squarepg.com',
                joinDate: '2023-01-01'
            });
            setLoading(false);
            return;
        }

        // Fetch Tenant
        const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .eq('email', email)
            .single();
        
        if (tenantData) {
            setTenant(tenantData);
            
            // Fetch Complaints
            const { data: complaintData } = await supabase
                .from('complaints')
                .select('*')
                .eq('tenantName', tenantData.name); // Using name as per existing logic, id is better if available
            
            if (complaintData) setComplaints(complaintData);
        }
        setLoading(false);
    };

    fetchData();
  }, [email, isDemo]);

  const handlePay = () => {
    if (!tenant) return;
    const upiLink = `upi://pay?pa=owner@upi&pn=SquarePG&am=${tenant.rentAmount}&cu=INR`;
    alert(`Simulating Payment of ₹${tenant.rentAmount}.\n\nIn a mobile app, this would open UPI: ${upiLink}`);
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    const newComplaint = {
      tenantId: tenant.id || 999,
      tenantName: tenant.name,
      title: complaintTitle,
      description: complaintDesc,
      status: 'Open',
      priority: 'Medium',
      date: new Date().toISOString().split('T')[0]
    };

    if (!isDemo) {
        await supabase.from('complaints').insert(newComplaint);
        // Refresh complaints locally
        setComplaints([...complaints, newComplaint as any]);
    } else {
        setComplaints([...complaints, { ...newComplaint, id: Date.now() } as any]);
    }
    
    setIsComplaintFormOpen(false);
    setComplaintTitle('');
    setComplaintDesc('');
  };

  if (loading) {
    return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  // Not Found State
  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in">
         <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
         </div>
         <h2 className="text-xl font-semibold">Tenant Not Found</h2>
         <p className="text-muted-foreground max-w-sm">
           We couldn't find a tenant record linked to <b>{email || 'your email'}</b>. 
           <br/><br/>
           If you are an owner testing this, please add a tenant with this email address first.
         </p>
         <button onClick={() => window.location.reload()} className="text-primary hover:underline text-sm">
             Refresh Page
         </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {isDemo && (
          <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg border border-blue-100 text-sm flex items-start gap-3">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                  <p className="font-semibold">Demo Mode</p>
                  <p>You are viewing a simulated tenant dashboard.</p>
              </div>
          </div>
      )}

      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl font-bold">
                {tenant.name.charAt(0)}
             </div>
             <div>
                <h1 className="text-2xl font-bold">{tenant.name}</h1>
                <p className="text-muted-foreground">Room {tenant.roomNumber}</p>
             </div>
         </div>
         <div className="text-center md:text-right">
             <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
             <p className="text-3xl font-mono font-bold text-primary">₹{tenant.rentStatus === 'Paid' ? '0' : tenant.rentAmount}</p>
             <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${tenant.rentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {tenant.rentStatus}
             </span>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Payment Section */}
         <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
               <CreditCard className="w-5 h-5" /> Payments
            </h3>
            {tenant.rentStatus === 'Paid' ? (
                <div className="text-center py-8">
                   <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                   <p className="font-medium text-green-600">All dues paid!</p>
                   <p className="text-sm text-muted-foreground">Next rent due on 1st of next month.</p>
                </div>
            ) : (
                <div className="space-y-4">
                   <div className="p-4 bg-secondary/50 rounded-lg flex justify-between items-center">
                      <span className="text-sm">Rent (Current Month)</span>
                      <span className="font-mono font-semibold">₹{tenant.rentAmount}</span>
                   </div>
                   <button 
                     onClick={handlePay}
                     className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                   >
                     Pay Now with UPI
                   </button>
                </div>
            )}
         </div>

         {/* Complaints Section */}
         <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-semibold text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Complaints
               </h3>
               <button onClick={() => setIsComplaintFormOpen(!isComplaintFormOpen)} className="text-sm text-primary hover:underline">
                  {isComplaintFormOpen ? 'Cancel' : 'New Complaint'}
               </button>
            </div>

            {isComplaintFormOpen ? (
                <form onSubmit={handleSubmitComplaint} className="space-y-3 mb-4 bg-secondary/30 p-4 rounded-lg">
                   <input 
                      className="w-full p-2 text-sm border border-border rounded-md bg-background"
                      placeholder="Title"
                      value={complaintTitle}
                      onChange={e => setComplaintTitle(e.target.value)}
                      required
                   />
                   <textarea 
                      className="w-full p-2 text-sm border border-border rounded-md bg-background"
                      placeholder="Describe your issue..."
                      rows={2}
                      value={complaintDesc}
                      onChange={e => setComplaintDesc(e.target.value)}
                      required
                   />
                   <button className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm">Submit</button>
                </form>
            ) : null}

            <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px]">
               {complaints.length === 0 && !isComplaintFormOpen && (
                  <p className="text-center text-muted-foreground text-sm py-4">No complaints history.</p>
               )}
               {complaints.map((c, i) => (
                  <div key={c.id || i} className="p-3 border border-border rounded-lg bg-secondary/10">
                     <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{c.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                           {c.status}
                        </span>
                     </div>
                     <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                     <p className="text-[10px] text-muted-foreground mt-2 text-right">{c.date}</p>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default TenantDashboard;