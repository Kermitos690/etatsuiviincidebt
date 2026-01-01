import { AppSidebar, MobileHeader } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { GlobalSearch } from '@/components/search';
import { NotificationCenter } from '@/components/notifications';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrbBackground } from '@/components/ui/orb-background';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-[100dvh] h-[100dvh] w-full relative flex flex-col overflow-hidden">
      {/* Premium animated background */}
      <OrbBackground />
      
      {/* Mobile header */}
      <MobileHeader />
      
      {/* Desktop top bar with search and notifications */}
      <div className="hidden lg:flex fixed top-0 right-0 z-50 items-center gap-2 p-4">
        <GlobalSearch 
          trigger={
            <Button variant="outline" size="sm" className="glass-card gap-2 border-glass">
              <Search className="h-4 w-4" />
              <span className="text-muted-foreground">Rechercher...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          }
        />
        <NotificationCenter />
      </div>
      
      <div className="flex flex-1 min-h-0 w-full relative z-10">
        {/* Desktop sidebar */}
        <AppSidebar />
        
        {/* Main content - scrollable area */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-20 lg:pb-0 lg:pt-16 overscroll-contain touch-pan-y">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
