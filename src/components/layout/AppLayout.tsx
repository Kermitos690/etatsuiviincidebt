import { AppSidebar, MobileHeader, DesktopSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full mesh-bg relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="orb-bg orb-1" />
      <div className="orb-bg orb-2" />
      
      {/* Mobile header */}
      <MobileHeader />
      
      <div className="flex w-full relative z-10">
        {/* Desktop sidebar */}
        <DesktopSidebar />
        
        {/* Main content */}
        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
