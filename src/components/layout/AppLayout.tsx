import { AppSidebar, MobileHeader, DesktopSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { GlobalSearch } from '@/components/search';
import { NotificationCenter } from '@/components/notifications';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      
      {/* Desktop top bar with search and notifications */}
      <div className="hidden lg:flex fixed top-0 right-0 z-50 items-center gap-2 p-4">
        <GlobalSearch 
          trigger={
            <Button variant="outline" size="sm" className="glass-card gap-2">
              <Search className="h-4 w-4" />
              <span className="text-muted-foreground">Rechercher...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          }
        />
        <NotificationCenter />
      </div>
      
      <div className="flex w-full relative z-10">
        {/* Desktop sidebar */}
        <DesktopSidebar />
        
        {/* Main content - add bottom padding on mobile for nav bar */}
        <main className="flex-1 min-h-screen overflow-y-auto pb-20 lg:pb-0 lg:pt-16">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
