import React, { useState } from 'react';
import { Users, IndianRupee, PieChart, AlertCircle, TrendingUp, ArrowRight, Loader2, Download, Calendar } from 'lucide-react';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { Link } from 'react-router-dom';
import { useSupabase } from '../hooks/useSupabase';
import { Tenant, Room, Payment, Expense } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Dashboard: React.FC = () => {
  const { data: tenants, loading: l1 } = useSupabase<Tenant>('tenants');
  const { data: rooms, loading: l2 } = useSupabase<Room>('rooms');
  const { data: payments, loading: l3 } = useSupabase<Payment>('payments');
  const { data: expenses, loading: l4 } = useSupabase<Expense>('expenses');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const isLoading = l1 || l2 || l3 || l4;

  // Real-time Dashboard Stats (All time / Current State)
  const totalTenants = tenants.length;
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  
  // Financials for the selected month for display
  const monthlyRevenue = payments
    .filter(p => p.date.startsWith(selectedMonth))
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDues = tenants.filter(t => t.rentStatus === 'Pending' || t.rentStatus === 'Overdue')
    .reduce((sum, t) => sum + t.rentAmount, 0);

  const generatePDF = () => {
    if (isLoading) return;

    try {
        const doc: any = new jsPDF();
        const monthName = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // --- DATA PREPARATION ---
        // 1. Filter Expenses for month
        const monthExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
        const totalExp = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // 2. Filter Revenue (Collection) for month
        const monthPayments = payments.filter(p => p.date.startsWith(selectedMonth));
        const totalColl = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

        // 3. Expected Rent Calculation (Based on active tenants)
        const activeTenants = tenants.filter(t => t.status !== 'Left');
        const expectedRent = activeTenants.reduce((sum, t) => sum + Number(t.rentAmount), 0);
        
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
        doc.setFont(undefined, 'bold');
        doc.text("Financial Summary", 20, 50);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        // Row 1
        doc.text("Expected Rent:", 20, 60);
        doc.text(`Rs. ${expectedRent.toLocaleString()}`, 60, 60);
        
        doc.text("Total Collected:", 100, 60);
        doc.setTextColor(0, 128, 0);
        doc.text(`Rs. ${totalColl.toLocaleString()}`, 140, 60);
        doc.setTextColor(0);

        // Row 2
        doc.text("Total Expenses:", 20, 70);
        doc.setTextColor(180, 0, 0);
        doc.text(`Rs. ${totalExp.toLocaleString()}`, 60, 70);
        doc.setTextColor(0);

        doc.text("Net Profit:", 100, 70);
        doc.setFont(undefined, 'bold');
        doc.text(`Rs. ${netProfit.toLocaleString()}`, 140, 70);

        // TABLE 1: Tenant Register
        let currentY = 85;
        doc.setFontSize(14);
        doc.text("Tenant Rent Register", 14, currentY);
        
        const tenantRows = activeTenants.map(t => {
            // How much did this tenant pay THIS month?
            const paidThisMonth = monthPayments
                .filter(p => p.tenantId === t.id)
                .reduce((sum, p) => sum + Number(p.amount), 0);
            
            const balance = Math.max(0, t.rentAmount - paidThisMonth);
            const status = balance === 0 ? 'Paid' : (paidThisMonth > 0 ? 'Partial' : 'Pending');

            return [
                t.roomNumber,
                t.name,
                t.rentAmount.toLocaleString(),
                paidThisMonth.toLocaleString(),
                balance.toLocaleString(),
                status
            ];
        });

        if (doc.autoTable) {
            doc.autoTable({
                startY: currentY + 5,
                head: [['Room', 'Name', 'Expected', 'Paid', 'Balance', 'Status']],
                body: tenantRows,
                theme: 'grid',
                headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
                bodyStyles: { fontSize: 9 },
                foot: [['', 'Total', expectedRent.toLocaleString(), totalColl.toLocaleString(), (expectedRent - totalColl).toLocaleString(), '']],
                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
            });
        }

        // TABLE 2: Expenses
        // @ts-ignore
        currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : currentY + 50;
        doc.setFontSize(14);
        doc.text("Expense Breakdown", 14, currentY);

        if (monthExpenses.length > 0) {
            const expenseRows = monthExpenses.map(e => [
                e.date,
                e.title,
                e.category,
                e.amount.toLocaleString()
            ]);

            if (doc.autoTable) {
                doc.autoTable({
                    startY: currentY + 5,
                    head: [['Date', 'Item', 'Category', 'Amount']],
                    body: expenseRows,
                    theme: 'striped',
                    headStyles: { fillColor: [192, 57, 43], fontSize: 9 }, // Red header
                    bodyStyles: { fontSize: 9 },
                    foot: [['', '', 'Total Expenses', totalExp.toLocaleString()]],
                    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
                });
            }
        } else {
             doc.setFontSize(10);
             doc.setFont(undefined, 'italic');
             doc.text("No expenses recorded for this month.", 14, currentY + 10);
        }

        doc.save(`PG_Report_${selectedMonth}.pdf`);
    } catch (e: any) {
        console.error("PDF Gen Error:", e);
        alert(`Failed to generate PDF. Error: ${e.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const recentTenants = [...tenants].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview for {selectedMonth}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                />
             </div>
            <button 
                onClick={generatePDF}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
            >
                <Download className="w-4 h-4" />
                Generate Report
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Tenants" 
          value={totalTenants} 
          trend="" 
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
          trend={occupancyRate > 80 ? 'High' : 'Low'} 
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        
        <div className="bg-card p-0 rounded-xl border border-border shadow-sm flex flex-col h-[400px] overflow-hidden">
           <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20">
               <h3 className="font-semibold text-card-foreground">Recent Tenants</h3>
               <Link to="/tenants" className="text-primary text-xs font-medium hover:underline">View All</Link>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {recentTenants.map((tenant) => (
                   <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border group">
                       <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-bold ring-2 ring-background group-hover:ring-border transition-all">
                               {tenant.name.charAt(0)}
                           </div>
                           <div>
                               <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                               <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wide">Room {tenant.roomNumber}</p>
                           </div>
                       </div>
                       <div className="text-right">
                           <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                               tenant.rentStatus === 'Paid' ? 'bg-green-500/10 text-green-500' :
                               tenant.rentStatus === 'Pending' ? 'bg-orange-500/10 text-orange-500' :
                               'bg-destructive/10 text-destructive'
                           }`}>
                               {tenant.rentStatus}
                           </span>
                       </div>
                   </div>
               ))}
               <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                   <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-primary"/>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-foreground">Tip</p>
                            <p className="text-[10px] text-muted-foreground">Download report to share status.</p>
                        </div>
                   </div>
                   <ArrowRight className="w-4 h-4 text-primary opacity-50"/>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;