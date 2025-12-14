import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useSupabase } from '../hooks/useSupabase';
import { Payment, Expense } from '../types';

const RevenueChart: React.FC = () => {
  const { theme } = useTheme();
  const { data: payments } = useSupabase<Payment>('payments');
  const { data: expenses } = useSupabase<Expense>('expenses');

  // Process data for the last 6 months
  const processData = () => {
      const months: Record<string, { name: string, revenue: number, expenses: number }> = {};
      
      // Init last 6 months
      for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const key = `${year}-${month}`; // YYYY-MM
          const name = d.toLocaleString('default', { month: 'short' });
          months[key] = { name, revenue: 0, expenses: 0 };
      }

      // Aggregate Revenue
      payments.forEach(p => {
          // p.date is typically YYYY-MM-DD
          const key = p.date.substring(0, 7); 
          if (months[key]) {
              months[key].revenue += Number(p.amount);
          }
      });

      // Aggregate Expenses
      expenses.forEach(e => {
          const key = e.date.substring(0, 7);
          if (months[key]) {
              months[key].expenses += Number(e.amount);
          }
      });

      return Object.values(months);
  };

  const data = processData();
  
  // Chart Colors based on theme
  const gridColor = theme === 'dark' ? '#27272a' : '#e2e8f0';
  const textColor = theme === 'dark' ? '#a1a1aa' : '#64748b';
  const tooltipBg = theme === 'dark' ? '#09090b' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#27272a' : '#e2e8f0';
  const barColorPrimary = theme === 'dark' ? '#fafafa' : '#18181b'; // zinc-50 vs zinc-950
  const barColorSecondary = theme === 'dark' ? '#3f3f46' : '#e4e4e7'; // zinc-700 vs zinc-200

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Financial Overview</h3>
        <div className="flex gap-4 text-xs">
           <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{background: barColorPrimary}}></div> Revenue
           </div>
           <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{background: barColorSecondary}}></div> Expenses
           </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 0,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 12, fontFamily: 'JetBrains Mono' }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 12, fontFamily: 'JetBrains Mono' }} 
            tickFormatter={(value) => `₹${value / 1000}k`} 
          />
          <Tooltip 
            cursor={{ fill: theme === 'dark' ? '#27272a' : '#f1f5f9', opacity: 0.4 }}
            contentStyle={{ 
              backgroundColor: tooltipBg, 
              borderRadius: '8px', 
              border: `1px solid ${tooltipBorder}`, 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: theme === 'dark' ? '#fff' : '#000',
              fontFamily: 'Inter'
            }}
          />
          <Bar dataKey="revenue" name="Revenue" fill={barColorPrimary} radius={[4, 4, 0, 0]} barSize={24} />
          <Bar dataKey="expenses" name="Expenses" fill={barColorSecondary} radius={[4, 4, 0, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;