import React, { useState } from 'react';
import { Search, Bell, Sparkles, Sun, Moon, Menu, LogOut, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSupabase } from '../hooks/useSupabase';

interface HeaderProps {
  onOpenAi: () => void;
  onToggleMenu: () => void;
}

interface Payment {
  id: number;
  tenantId: number;
  amount: number;
  status: string;
  tenants: {
    name: string;
    room_number: string;
  };
}

interface Complaint {
  id: number;
  tenantId: number;
  title: string;
  status: string;
  tenants: {
    name: string;
  };
}

const Header: React.FC<HeaderProps> = ({ onOpenAi, onToggleMenu }) => {
  const { theme, setTheme } = useTheme();
  const { signOut, user, role } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch payments with tenant info
  const { data: allPayments } = useSupabase<Payment>('payments', '*, tenants!inner(name, room_number)');
  
  // Fetch complaints with tenant info
  const { data: allComplaints } = useSupabase<Complaint>('complaints', '*, tenants!inner(name)');

  // Filter for pending/overdue payments
  const pendingPayments = allPayments.filter(p => 
    p.status === 'Pending' || p.status === 'Overdue'
  );

  // Filter for open/pending complaints
  const openComplaints = allComplaints.filter(c => 
    c.status === 'Pending' || c.status === 'Open'
  );

  const notificationCount = pendingPayments.length + openComplaints.length;

  return (
    <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onToggleMenu}
          className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {role === 'owner' && (
          <div className="relative w-full max-w-sm hidden sm:block group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search tenants..." 
              className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-transparent focus:border-input focus:bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onOpenAi}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow hover:shadow-md transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask AI
        </button>

        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
               <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background animate-pulse"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
               <div className="p-3 border-b border-border bg-muted/30">
                  <h4 className="font-semibold text-sm">Notifications</h4>
               </div>
               <div className="max-h-[300px] overflow-y-auto">
                 {notificationCount === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      All caught up!
                    </div>
                 ) : (
                   <div className="p-1">
                      {pendingPayments.map(payment => (
                        <div key={`payment-${payment.id}`} className="p-3 hover:bg-muted/50 rounded-lg flex gap-3 transition-colors border-b border-border last:border-0">
                           <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                           <div>
                              <p className="text-sm font-medium text-foreground">
                                {payment.status === 'Overdue' ? 'Rent Overdue' : 'Rent Pending'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {payment.tenants?.name} (Room {payment.tenants?.room_number}) owes ₹{payment.amount}
                              </p>
                           </div>
                        </div>
                      ))}
                      {openComplaints.map(complaint => (
                        <div key={`complaint-${complaint.id}`} className="p-3 hover:bg-muted/50 rounded-lg flex gap-3 transition-colors border-b border-border last:border-0">
                           <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                           <div>
                              <p className="text-sm font-medium text-foreground">New Complaint</p>
                              <p className="text-xs text-muted-foreground">
                                {complaint.title} by {complaint.tenants?.name}
                              </p>
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
        
        <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-3 pl-1">
          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden">
             <div className="text-xs font-bold text-muted-foreground">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
             </div>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground leading-none">{role === 'owner' ? 'Owner' : 'Tenant'}</p>
            <button onClick={signOut} className="text-[10px] text-muted-foreground mt-1 leading-none hover:text-destructive flex items-center gap-1">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
