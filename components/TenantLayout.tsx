import React from 'react';
import TenantSidebar from './TenantSidebar';

interface TenantLayoutProps {
  children: React.ReactNode;
}

const TenantLayout: React.FC<TenantLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <TenantSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Add top padding on mobile to account for menu button */}
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default TenantLayout;
