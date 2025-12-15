import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Payment } from '../types';
import { CreditCard, IndianRupee, Calendar, Loader2 } from 'lucide-react';

const TenantPayments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const userEmail = localStorage.getItem('pg_user_email');
      const { data: { user } } = await supabase.auth.getUser();

      console.log('🔍 Fetching payments for tenant:', { userEmail, userId: user?.id });

      // Get tenant data - handle both auth_user_id and email
      let tenantQuery = supabase
        .from('tenants')
        .select('id');

      if (user?.id) {
        tenantQuery = tenantQuery.eq('auth_user_id', user.id);
      } else if (userEmail) {
        tenantQuery = tenantQuery.eq('email', userEmail.toLowerCase().trim());
      }

      const { data: tenant, error: tenantError } = await tenantQuery.maybeSingle();

      if (tenantError) {
        console.error('❌ Error fetching tenant:', tenantError);
        setLoading(false);
        return;
      }

      if (!tenant) {
        console.error('❌ No tenant found');
        setLoading(false);
        return;
      }

      console.log('✅ Tenant found:', tenant.id);

      // Fetch payments for this tenant
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('tenantId', tenant.id)
        .order('date', { ascending: false });

      if (paymentsError) {
        console.error('❌ Error fetching payments:', paymentsError);
      } else {
        console.log('✅ Payments loaded:', paymentsData?.length || 0);
        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header - Responsive */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold break-words">Payment History</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">View all your rent payments</p>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No payment history yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => (
            <div 
              key={payment.id} 
              className="bg-card p-4 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-primary/30 transition-colors"
            >
              {/* Left side - Icon and details */}
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm sm:text-base truncate">
                    {payment.type || 'Rent Payment'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 mt-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">
                      {payment.date 
                        ? new Date(payment.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'No date'}
                    </span>
                  </p>
                </div>
              </div>
              
              {/* Right side - Amount */}
              <div className="text-left sm:text-right flex-shrink-0">
                <p className="text-base sm:text-lg font-bold text-green-600">
                  ₹{Number(payment.amount || 0).toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {payment.method || 'Cash'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantPayments;
