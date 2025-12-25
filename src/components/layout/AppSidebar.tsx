import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  AlertTriangle, 
  Plus,
  Brain,
  FileText,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/nouveau', icon: Plus, label: 'Nouvel incident' },
  { to: '/ia-auditeur', icon: Brain, label: 'IA Auditeur' },
  { to: '/exports', icon: FileText, label: 'Exports PDF' },
  { to: '/admin', icon: Settings, label: 'Administration' },
];

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex-1 p-2 space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.to || 
          (item.to !== '/' && location.pathname.startsWith(item.to));
        
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive 
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                : "text-sidebar-foreground"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

// Mobile header with hamburger menu
export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b bg-background">
      <div>
        <h1 className="font-serif text-lg font-semibold">Registre</h1>
      </div>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-sidebar-border">
              <h1 className="font-serif text-lg font-semibold text-sidebar-foreground">
                Registre
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Incidents & Audit</p>
            </div>
            
            {/* Navigation */}
            <NavContent onItemClick={() => setOpen(false)} />
            
            {/* Footer */}
            <div className="p-4 border-t border-sidebar-border">
              <p className="text-xs text-sidebar-foreground/50 text-center">
                Audit & Traçabilité v1.0
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

// Desktop sidebar
export function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="font-serif text-lg font-semibold text-sidebar-foreground">
          Registre
        </h1>
        <p className="text-xs text-sidebar-foreground/60">Incidents & Audit</p>
      </div>

      {/* Navigation */}
      <NavContent />

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50 text-center">
          Audit & Traçabilité v1.0
        </p>
      </div>
    </aside>
  );
}

export function AppSidebar() {
  return (
    <>
      <MobileHeader />
      <DesktopSidebar />
    </>
  );
}
