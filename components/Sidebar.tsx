import React from 'react';
import { LayoutDashboard, Users, BedDouble, Wallet, FileWarning, Settings, LogOut, Hexagon, X, Receipt } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { role, signOut } = useAuth();

  const menuItems = role === 'owner' ? [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Tenants', path: '/tenants' },
    { icon: BedDouble, label: 'Rooms', path: '/rooms' },
    { icon: Wallet, label: 'Payments', path: '/payments' },
    { icon: Receipt, label: 'Expenses', path: '/expenses' },
    { icon: FileWarning, label: 'Complaints', path: '/complaints' },
  ] : [
    { icon: LayoutDashboard, label: 'My Dashboard', path: '/my-dashboard' },
  ];

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:translate-x-0
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      <div className="h-16 px-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <Hexagon className="w-5 h-5 fill-current" />
          </div>
          <span className="text-lg font-bold tracking-tight">AshirwadPG</span>
        </div>
        <button onClick={onClose} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-4 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-2">Menu</p>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-secondary text-secondary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              {item.label}
            </Link>
          );
        })}

        {role === 'owner' && (
          <>
            <p className="px-4 text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">System</p>
            <Link
              to="/settings"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <button 
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;