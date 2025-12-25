import { AppSidebar, MobileHeader, DesktopSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      {/* Mobile header */}
      <MobileHeader />
      
      <div className="flex w-full">
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
