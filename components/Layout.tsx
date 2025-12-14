import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AiAssistant from './AiAssistant';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-w-0 transition-all duration-300">
        <Header 
          onOpenAi={() => setIsAiOpen(true)} 
          onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
             {children}
          </div>
        </main>
      </div>
      <AiAssistant isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
};

export default Layout;