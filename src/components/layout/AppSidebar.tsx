import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  AlertTriangle, 
  Plus,
  Brain,
  FileText,
  Settings,
  Menu,
  Sparkles,
  Mail,
  Table,
  LogOut,
  BarChart3,
  Scale,
  Paperclip,
  GraduationCap,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/emails', icon: Mail, label: 'Boîte de réception' },
  { to: '/emails-analyzed', icon: BarChart3, label: 'Emails Analysés' },
  { to: '/attachments', icon: Paperclip, label: 'Pièces Jointes' },
  { to: '/analysis-pipeline', icon: Sparkles, label: 'Analyse 3 Passes' },
  { to: '/violations', icon: Scale, label: 'Violations' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/incidents-timeline', icon: Scale, label: 'Timeline Incidents' },
  { to: '/nouveau', icon: Plus, label: 'Nouvel incident' },
  { to: '/ia-auditeur', icon: Brain, label: 'IA Auditeur' },
  { to: '/ia-training', icon: GraduationCap, label: 'Entraînement IA' },
  { to: '/gmail-config', icon: Mail, label: 'Config Gmail' },
  { to: '/sheets-config', icon: Table, label: 'Config Sheets' },
  { to: '/exports', icon: FileText, label: 'Exports PDF' },
  { to: '/admin', icon: Settings, label: 'Administration' },
  { to: '/tutorial', icon: HelpCircle, label: 'Tutoriel' },
];

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erreur lors de la déconnexion');
    } else {
      toast.success('Déconnexion réussie');
      navigate('/auth');
    }
    onItemClick?.();
  };

  return (
    <nav className="flex-1 p-3 space-y-1.5 flex flex-col overflow-y-auto">
      <div className="flex-1 space-y-1.5">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                "hover:bg-sidebar-accent/80 hover:scale-[1.02] hover:shadow-glow-sm",
                "animate-slide-up",
                isActive 
                  ? "bg-gradient-primary text-primary-foreground shadow-glow font-medium" 
                  : "text-sidebar-foreground"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "relative p-1.5 rounded-lg transition-all duration-300",
                isActive 
                  ? "bg-white/20" 
                  : "bg-sidebar-accent/50 group-hover:bg-primary/10"
              )}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {isActive && (
                  <div className="absolute inset-0 rounded-lg animate-pulse-glow" />
                )}
              </div>
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <Sparkles className="h-3 w-3 ml-auto opacity-60 animate-float" />
              )}
            </NavLink>
          );
        })}
      </div>
      
      {/* User info and logout */}
      <div className="pt-2 border-t border-glass/50">
        {user && (
          <p className="px-4 py-2 text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <div className="p-1.5 rounded-lg bg-sidebar-accent/50 group-hover:bg-destructive/20 transition-all duration-300">
            <LogOut className="h-4 w-4 flex-shrink-0" />
          </div>
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </nav>
  );
}

// Mobile header with hamburger menu
export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b border-glass bg-glass backdrop-blur-glass">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm animate-float">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold gradient-text">Registre</h1>
          <p className="text-[10px] text-muted-foreground">Liquid Glass 2026</p>
        </div>
      </div>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="relative overflow-hidden rounded-xl hover:bg-primary/10 hover:shadow-glow-sm transition-all duration-300"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="w-80 p-0 bg-glass backdrop-blur-glass border-r border-glass overflow-y-auto"
        >
          <div className="flex flex-col min-h-full">
            {/* Header */}
            <div className="p-5 border-b border-glass">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold gradient-text">
                    Registre
                  </h1>
                  <p className="text-xs text-muted-foreground">Incidents & Audit</p>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <NavContent onItemClick={() => setOpen(false)} />
            
            {/* Footer */}
            <div className="p-4 border-t border-glass">
              <div className="glass-card p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Apple Liquid Glass 2026
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Premium Edition v1.0
                </p>
              </div>
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
    <aside className="hidden lg:flex h-screen w-72 sidebar-glass flex-col sticky top-0 overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl animate-orb-float" />
      <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl animate-orb-float" style={{ animationDelay: '-10s' }} />
      
      {/* Header */}
      <div className="relative p-6 border-b border-glass">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background animate-pulse-glow" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold gradient-text">
              Registre
            </h1>
            <p className="text-xs text-muted-foreground">Incidents & Audit</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <NavContent />

      {/* Footer */}
      <div className="relative p-4 border-t border-glass">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-secondary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium">Liquid Glass</p>
                <p className="text-[10px] text-muted-foreground">2026 Edition</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full w-3/4 rounded-full bg-gradient-primary animate-shimmer" 
                 style={{ backgroundSize: '200% 100%' }} />
          </div>
        </div>
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
