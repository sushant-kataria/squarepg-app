import React, { useState, useEffect } from 'react';
import { 
  Home, 
  IndianRupee, 
  AlertCircle, 
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  MessageSquare,
  Loader2,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tenant, Payment, Complaint } from '../types';
import StatCard from '../components/StatCard';
import { useNavigate } from 'react-router-dom';

const TenantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const userEmail = localStorage.getItem('pg_user_email');
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('🔍 Fetching tenant data for:', { 
        userEmail, 
        userId: user?.id,
        authUser: user?.email
      });

      if (!user && !userEmail) {
        throw new Error('No user session found. Please log in again.');
      }

      let tenantQuery = supabase
        .from('tenants')
        .select('*');

      if (user?.id) {
        console.log('🔍 Searching by auth_user_id:', user.id);
        tenantQuery = tenantQuery.eq('auth_user_id', user.id);
      } else if (userEmail) {
        console.log('🔍 Searching by email:', userEmail);
        tenantQuery = tenantQuery.eq('email', userEmail.toLowerCase().trim());
      } else {
        throw new Error('No user identification found');
      }

      const { data: tenant, error: tenantError } = await tenantQuery.maybeSingle();

      if (tenantError) {
        console.error('❌ Error fetching tenant:', tenantError);
        throw new Error(`Database error: ${tenantError.message}`);
      }

      if (!tenant) {
        console.error('❌ No tenant found for:', { userEmail, userId: user?.id });
        setError('Tenant Not Found');
        setLoading(false);
        return;
      }

      console.log('✅ Tenant data loaded:', tenant);
      setTenantData(tenant);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('tenantId', tenant.id)
        .order('date', { ascending: false });

      if (paymentsError) {
        console.error('❌ Error fetching payments:', paymentsError);
      } else {
        setPayments(paymentsData || []);
      }

      // Fetch complaints
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select('*')
        .eq('tenantId', tenant.id)
        .order('created_at', { ascending: false });

      if (complaintsError) {
        console.error('❌ Error fetching complaints:', complaintsError);
      } else {
        setComplaints(complaintsData || []);
      }

    } catch (err: any) {
      console.error('❌ Error loading tenant data:', err);
      setError(err.message || 'Failed to load tenant data');
      setTenantData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !tenantData) {
    const userEmail = localStorage.getItem('pg_user_email');
    
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border text-center max-w-md w-full">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold mb-2 text-foreground">Tenant Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't find a tenant record linked to <strong className="break-all">{userEmail}</strong>.
          </p>
          <div className="bg-secondary/30 p-4 rounded-lg text-left text-xs sm:text-sm text-muted-foreground mb-6">
            <p className="font-medium text-foreground mb-2">Possible reasons:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Your account hasn't been set up yet</li>
              <li>You haven't accepted your invitation</li>
              <li>Your email doesn't match our records</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                localStorage.clear();
                navigate('/login');
              }}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 font-medium transition-colors text-sm"
            >
              Back to Login
            </button>
            <button
              onClick={fetchTenantData}
              className="bg-secondary text-secondary-foreground px-6 py-2.5 rounded-lg hover:bg-secondary/90 font-medium transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalPaid = payments
    .filter(p => p.type === 'Rent')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const pendingComplaints = complaints.filter(c => c.status !== 'Resolved').length;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground break-words">
          Welcome, {tenantData.name}! 👋
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Here's your rental overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard 
          title="Room Number" 
          value={`#${tenantData.roomNumber || 'N/A'}`} 
          trend="Your Space" 
          trendUp={true} 
          icon={Home} 
        />
        <StatCard 
          title="Monthly Rent" 
          value={`₹${tenantData.rentAmount?.toLocaleString() || '0'}`} 
          trend={tenantData.rentStatus || 'Pending'} 
          trendUp={tenantData.rentStatus === 'Paid'} 
          icon={IndianRupee} 
        />
        <StatCard 
          title="Total Paid" 
          value={`₹${totalPaid.toLocaleString()}`} 
          trend="All Time" 
          trendUp={true} 
          icon={CreditCard} 
        />
        <StatCard 
          title="Pending Issues" 
          value={pendingComplaints} 
          trend={pendingComplaints === 0 ? "All Clear" : "Needs Attention"} 
          trendUp={pendingComplaints === 0} 
          icon={AlertCircle} 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Tenant Details Card */}
        <div className="lg:col-span-1 bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            Your Details
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium text-foreground break-words">{tenantData.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="text-sm font-medium text-foreground">{tenantData.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Email Address</p>
                <p className="text-sm font-medium text-foreground break-all">{tenantData.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium text-foreground break-words">{tenantData.address || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Move-in Date</p>
                <p className="text-sm font-medium text-foreground">
                  {(tenantData.moveInDate || tenantData.joinDate)
                    ? new Date(tenantData.moveInDate || tenantData.joinDate!).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Not recorded'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tenantData.status === 'Active' 
                    ? 'bg-green-500/10 text-green-600' 
                    : tenantData.status === 'Notice Period'
                    ? 'bg-orange-500/10 text-orange-600'
                    : 'bg-gray-500/10 text-gray-600'
                }`}>
                  {tenantData.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History & Complaints */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Recent Payments */}
          <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              Recent Payments
            </h3>
            {payments.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {payments.slice(0, 5).map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <IndianRupee className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{payment.type || 'Payment'}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.date 
                            ? new Date(payment.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : 'No date'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-600 whitespace-nowrap">
                        ₹{Number(payment.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.method || 'Cash'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No payment history yet</p>
              </div>
            )}
          </div>

          {/* Recent Complaints */}
          <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              Your Complaints
            </h3>
            {complaints.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {complaints.slice(0, 5).map((complaint) => (
                  <div 
                    key={complaint.id} 
                    className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground break-words">{complaint.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                          {complaint.description || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {complaint.created_at 
                            ? new Date(complaint.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'No date'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                      complaint.status === 'Resolved' 
                        ? 'bg-green-500/10 text-green-600' 
                        : complaint.status === 'In Progress'
                        ? 'bg-blue-500/10 text-blue-600'
                        : 'bg-orange-500/10 text-orange-600'
                    }`}>
                      {complaint.status || 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No complaints filed</p>
                <p className="text-xs mt-1">Contact your manager for assistance</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
        <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-foreground">Need Help?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Contact your property manager for any queries regarding rent, maintenance, or other concerns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
