import React, { useState, useEffect } from 'react';
import { Users, IndianRupee, PieChart, AlertCircle, TrendingUp, ArrowRight, Loader2, Download, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { Link } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import { Tenant, Room, Payment, Expense } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: tenants, loading: l1 } = useSupabase<Tenant>('tenants');
  const { data: rooms, loading: l2 } = useSupabase<Room>('rooms');
  const { data: payments, loading: l3 } = useSupabase<Payment>('payments');
  const { data: expenses, loading: l4 } = useSupabase<Expense>('expenses');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Role check - Redirect tenants away from owner dashboard
  useEffect(() => {
    const userRole = localStorage.getItem('pg_user_role');
    console.log('📊 Dashboard loaded, role:', userRole);
    
    if (userRole === 'tenant' || role === 'tenant') {
      console.log('🔄 Tenant detected, redirecting to tenant dashboard');
      navigate('/my-dashboard', { replace: true });
    }
  }, [role, navigate]);

  const isLoading = l1 || l2 || l3 || l4;

  // Real-time Dashboard Stats
  const totalTenants = tenants.length;
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  
  // Financials for the selected month
  const monthlyRevenue = payments
    .filter(p => p.date && p.date.startsWith(selectedMonth))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalDues = tenants
    .filter(t => t.rentStatus === 'Pending' || t.rentStatus === 'Overdue')
    .reduce((sum, t) => sum + (Number(t.rentAmount) || 0), 0);

  const generatePDF = () => {
    if (isLoading) {
      alert('Please wait for data to load...');
      return;
    }

    try {
      console.log('📄 Generating PDF report for:', selectedMonth);

      const doc = new jsPDF();
      const monthName = new Date(selectedMonth + '-01').toLocaleString('default', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      // --- DATA PREPARATION ---
      // 1. Filter Expenses for month
      const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(selectedMonth));
      const totalExp = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // 2. Filter Revenue (Collection) for month
      const monthPayments = payments.filter(p => p.date && p.date.startsWith(selectedMonth));
      const totalColl = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // 3. Expected Rent Calculation (Based on active tenants)
      const activeTenants = tenants.filter(t => t.status !== 'Left');
      const expectedRent = activeTenants.reduce((sum, t) => sum + (Number(t.rentAmount) || 0), 0);
      
      const netProfit = totalColl - totalExp;

      // --- PDF GENERATION ---

      // Header
      doc.setFontSize(22);
      doc.setTextColor(40);
      doc.text('PG Monthly Financial Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.text(`Report Period: ${monthName}`, 14, 33);

      // Summary Box
      doc.setDrawColor(200);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, 40, 182, 35, 3, 3, 'FD');
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Summary', 20, 50);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Row 1
      doc.text('Expected Rent:', 20, 60);
      doc.text(`Rs. ${expectedRent.toLocaleString()}`, 70, 60);
      
      doc.text('Total Collected:', 110, 60);
      doc.setTextColor(0, 128, 0);
      doc.text(`Rs. ${totalColl.toLocaleString()}`, 150, 60);
      doc.setTextColor(0);

      // Row 2
      doc.text('Total Expenses:', 20, 68);
      doc.setTextColor(180, 0, 0);
      doc.text(`Rs. ${totalExp.toLocaleString()}`, 70, 68);
      doc.setTextColor(0);

      doc.text('Net Profit:', 110, 68);
      doc.setFont('helvetica', 'bold');
      if (netProfit >= 0) {
        doc.setTextColor(0, 128, 0);
      } else {
        doc.setTextColor(180, 0, 0);
      }
      doc.text(`Rs. ${netProfit.toLocaleString()}`, 150, 68);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');

      // TABLE 1: Tenant Rent Register
      let currentY = 82;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Tenant Rent Register', 14, currentY);
      
      const tenantRows = activeTenants.map(t => {
        // How much did this tenant pay THIS month?
        const paidThisMonth = monthPayments
          .filter(p => p.tenantId === t.id)
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        
        const balance = Math.max(0, (Number(t.rentAmount) || 0) - paidThisMonth);
        const status = balance === 0 ? 'Paid' : (paidThisMonth > 0 ? 'Partial' : 'Pending');

        return [
          String(t.roomNumber || '-'),
          String(t.name || 'Unknown'),
          `Rs. ${(Number(t.rentAmount) || 0).toLocaleString()}`,
          `Rs. ${paidThisMonth.toLocaleString()}`,
          `Rs. ${balance.toLocaleString()}`,
          status
        ];
      });

      // Tenant table
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Room', 'Name', 'Expected', 'Paid', 'Balance', 'Status']],
        body: tenantRows,
        theme: 'grid',
        headStyles: { 
          fillColor: [66, 66, 66], 
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        foot: [[
          '', 
          'Total', 
          `Rs. ${expectedRent.toLocaleString()}`, 
          `Rs. ${totalColl.toLocaleString()}`, 
          `Rs. ${Math.max(0, expectedRent - totalColl).toLocaleString()}`, 
          ''
        ]],
        footStyles: { 
          fillColor: [240, 240, 240], 
          textColor: [0, 0, 0], 
          fontStyle: 'bold',
          fontSize: 9
        }
      });

      // TABLE 2: Expenses
      currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 100;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Breakdown', 14, currentY);

      if (monthExpenses.length > 0) {
        const expenseRows = monthExpenses.map(e => [
          String(e.date || '-'),
          String(e.title || 'Untitled'),
          String(e.category || 'Other'),
          `Rs. ${(Number(e.amount) || 0).toLocaleString()}`
        ]);

        (doc as any).autoTable({
          startY: currentY + 5,
          head: [['Date', 'Item', 'Category', 'Amount']],
          body: expenseRows,
          theme: 'striped',
          headStyles: { 
            fillColor: [192, 57, 43], 
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: { fontSize: 9 },
          foot: [['', '', 'Total Expenses', `Rs. ${totalExp.toLocaleString()}`]],
          footStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [180, 0, 0], 
            fontStyle: 'bold',
            fontSize: 9
          }
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text('No expenses recorded for this month.', 14, currentY + 10);
        doc.setFont('helvetica', 'normal');
      }

      // Footer
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : currentY + 20;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Report generated by AshirwadPG Dashboard on ${new Date().toLocaleString()}`,
        14,
        finalY
      );

      const filename = `PG_Report_${selectedMonth}.pdf`;
      doc.save(filename);
      
      console.log('✅ PDF generated:', filename);
      alert(`📄 Report downloaded successfully!\n\nFilename: ${filename}`);

    } catch (e: any) {
      console.error("❌ PDF Generation Error:", e);
      alert(`Failed to generate PDF.\n\nError: ${e.message}\n\nPlease ensure all data is valid and try again.`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const recentTenants = [...tenants]
    .sort((a, b) => {
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idB - idA;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview for {new Date(selectedMonth + '-01').toLocaleString('default', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={new Date().toISOString().slice(0, 7)}
              className="pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
            />
          </div>
          <button 
            onClick={generatePDF}
            disabled={isLoading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Tenants" 
          value={totalTenants} 
          trend={`${tenants.filter(t => t.status === 'Active').length} Active`} 
          trendUp={true} 
          icon={Users} 
        />
        <StatCard 
          title="Monthly Collection" 
          value={`₹${monthlyRevenue.toLocaleString()}`} 
          trend={`${selectedMonth} Revenue`} 
          trendUp={true} 
          icon={IndianRupee} 
        />
        <StatCard 
          title="Occupancy" 
          value={`${occupancyRate}%`} 
          trend={`${occupiedRooms}/${totalRooms} Rooms`} 
          trendUp={occupancyRate > 80} 
          icon={PieChart} 
        />
        <StatCard 
          title="Total Pending Dues" 
          value={`₹${totalDues.toLocaleString()}`} 
          trend={totalDues > 0 ? "Action Needed" : "All Clear"} 
          trendUp={totalDues === 0} 
          icon={AlertCircle} 
        />
      </div>

      {/* Chart and Recent Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        
        {/* Recent Tenants */}
        <div className="bg-card p-0 rounded-xl border border-border shadow-sm flex flex-col h-[400px] overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20">
            <h3 className="font-semibold text-card-foreground">Recent Tenants</h3>
            <Link 
              to="/tenants" 
              className="text-primary text-xs font-medium hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
           
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {recentTenants.length > 0 ? (
              <>
                {recentTenants.map((tenant) => (
                  <div 
                    key={tenant.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border group cursor-pointer"
                    onClick={() => navigate('/tenants')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-bold ring-2 ring-background group-hover:ring-border transition-all">
                        {(tenant.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tenant.name || 'Unknown'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wide">
                          Room {tenant.roomNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        tenant.rentStatus === 'Paid' ? 'bg-green-500/10 text-green-500' :
                        tenant.rentStatus === 'Pending' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {tenant.rentStatus || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 group hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary"/>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Quick Tip</p>
                      <p className="text-[10px] text-muted-foreground">Download monthly report to track finances</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity"/>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No tenants yet</p>
                <Link 
                  to="/tenants" 
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Add your first tenant
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
