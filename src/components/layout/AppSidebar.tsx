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
  HelpCircle,
  Layers,
  Server,
  ChevronDown,
  Inbox,
  Activity,
  Cog,
  User,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ============= Types =============
interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

// ============= Navigation Structure =============
const navCategories: NavCategory[] = [
  {
    id: 'dashboard',
    label: 'Vue Générale',
    icon: LayoutDashboard,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/violations', icon: Scale, label: 'Violations' },
    ]
  },
  {
    id: 'emails',
    label: 'Emails & Analyse',
    icon: Mail,
    items: [
      { to: '/emails', icon: Inbox, label: 'Boîte de réception' },
      { to: '/emails-analyzed', icon: BarChart3, label: 'Emails Analysés' },
      { to: '/attachments', icon: Paperclip, label: 'Pièces Jointes' },
      { to: '/analysis-pipeline', icon: Activity, label: 'Analyse 3 Passes' },
    ]
  },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: AlertTriangle,
    items: [
      { to: '/journal', icon: BookOpen, label: 'Journal' },
      { to: '/incidents', icon: AlertTriangle, label: 'Liste Incidents' },
      { to: '/incidents-timeline', icon: Scale, label: 'Timeline' },
      { to: '/nouveau', icon: Plus, label: 'Nouvel Incident' },
    ]
  },
  {
    id: 'ia',
    label: 'Intelligence IA',
    icon: Brain,
    items: [
      { to: '/ia-auditeur', icon: Brain, label: 'IA Auditeur' },
      { to: '/ia-training', icon: GraduationCap, label: 'Entraînement IA' },
      { to: '/swipe-training', icon: Layers, label: 'Swipe Training' },
    ]
  },
  {
    id: 'config',
    label: 'Configuration',
    icon: Cog,
    items: [
      { to: '/gmail-config', icon: Mail, label: 'Config Gmail' },
      { to: '/sheets-config', icon: Table, label: 'Config Sheets' },
      { to: '/exports', icon: FileText, label: 'Exports PDF' },
      { to: '/system-admin', icon: Server, label: 'Système' },
      { to: '/admin', icon: Settings, label: 'Administration' },
      { to: '/tutorial', icon: HelpCircle, label: 'Tutoriel' },
    ]
  },
];

// ============= Components =============
function NavCategorySection({ 
  category, 
  isOpen, 
  onToggle,
  onItemClick 
}: { 
  category: NavCategory;
  isOpen: boolean;
  onToggle: () => void;
  onItemClick?: () => void;
}) {
  const location = useLocation();
  const hasActiveItem = category.items.some(item => 
    location.pathname === item.to || 
    (item.to !== '/' && location.pathname.startsWith(item.to))
  );

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200",
            "text-sm font-medium",
            hasActiveItem 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <category.icon className="h-4 w-4" />
            <span>{category.label}</span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
        {category.items.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              className={cn(
                "group flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent/60",
                isActive 
                  ? "bg-gradient-primary text-primary-foreground shadow-sm font-medium" 
                  : "text-sidebar-foreground/80"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, profile, roles } = useAuth();
  
  // Auto-open categories with active items
  const getInitialOpenState = () => {
    const openState: Record<string, boolean> = {};
    navCategories.forEach(cat => {
      openState[cat.id] = cat.items.some(item => 
        location.pathname === item.to || 
        (item.to !== '/' && location.pathname.startsWith(item.to))
      );
    });
    // Always open first category if none is active
    if (!Object.values(openState).some(v => v)) {
      openState['dashboard'] = true;
    }
    return openState;
  };

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(getInitialOpenState);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    <nav className="flex-1 p-3 space-y-2 flex flex-col overflow-y-auto">
      <div className="flex-1 space-y-1">
        {navCategories.map((category) => (
          <NavCategorySection
            key={category.id}
            category={category}
            isOpen={openCategories[category.id] || false}
            onToggle={() => toggleCategory(category.id)}
            onItemClick={onItemClick}
          />
        ))}
      </div>
      
      {/* User info and actions */}
      <div className="pt-2 border-t border-glass/50 space-y-1">
        {/* Profile link */}
        <NavLink
          to="/profile"
          onClick={onItemClick}
          className={cn(
            "group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
            location.pathname === '/profile'
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          )}
        >
          <div className="p-1.5 rounded-lg bg-sidebar-accent/50 group-hover:bg-primary/10 transition-all duration-300">
            <User className="h-4 w-4 flex-shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.display_name || user?.email?.split('@')[0] || 'Profil'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {roles.length > 0 ? roles.map(r => r === 'admin' ? 'Admin' : r === 'auditor' ? 'Auditeur' : 'Utilisateur').join(', ') : 'Utilisateur'}
            </p>
          </div>
        </NavLink>

        {/* Logout button */}
        <button
          onClick={handleSignOut}
          className="w-full group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <div className="p-1.5 rounded-lg bg-sidebar-accent/50 group-hover:bg-destructive/20 transition-all duration-300">
            <LogOut className="h-4 w-4 flex-shrink-0" />
          </div>
          <span className="font-medium text-sm">Déconnexion</span>
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
