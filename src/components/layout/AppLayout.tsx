import { AppSidebar, MobileHeader, DesktopSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full mesh-bg relative">
      {/* Animated background orbs */}
      <div className="orb-bg orb-1 fixed" />
      <div className="orb-bg orb-2 fixed" />
      
      {/* Mobile header */}
      <MobileHeader />
      
      <div className="flex w-full relative z-10">
        {/* Desktop sidebar */}
        <DesktopSidebar />
        
        {/* Main content - add bottom padding on mobile for nav bar */}
        <main className="flex-1 min-h-screen overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
