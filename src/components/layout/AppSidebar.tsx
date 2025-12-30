import { useState, useEffect, useCallback, useMemo } from 'react';
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
  LogOut,
  BarChart3,
  Paperclip,
  HelpCircle,
  Layers,
  ChevronDown,
  Inbox,
  Activity,
  Cog,
  User,
  LucideIcon,
  FolderOpen,
  CalendarPlus
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

// Simplified navigation structure - 5 categories only
const navCategories: NavCategory[] = [
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
    icon: LayoutDashboard,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/control-center', icon: Activity, label: 'Centre de Contrôle' },
    ]
  },
  {
    id: 'emails',
    label: 'Emails',
    icon: Mail,
    items: [
      { to: '/emails', icon: Inbox, label: 'Boîte de réception' },
      { to: '/emails-analyzed', icon: BarChart3, label: 'Analysés' },
      { to: '/email-cleanup', icon: Layers, label: 'Nettoyage' },
      { to: '/attachments', icon: Paperclip, label: 'Pièces Jointes' },
    ]
  },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: AlertTriangle,
    items: [
      { to: '/journal', icon: BookOpen, label: 'Journal' },
      { to: '/incidents', icon: AlertTriangle, label: 'Liste' },
      { to: '/incidents-timeline', icon: Activity, label: 'Timeline' },
      { to: '/nouveau', icon: Plus, label: 'Nouveau' },
    ]
  },
  {
    id: 'factual',
    label: 'Dossier Factuel',
    icon: FolderOpen,
    items: [
      { to: '/factual-dossier', icon: FileText, label: 'Chronologie' },
      { to: '/events', icon: CalendarPlus, label: 'Événements' },
      { to: '/ia-auditeur', icon: Brain, label: 'Analyse IA' },
      { to: '/analysis-pipeline', icon: Brain, label: 'Pipeline' },
    ]
  },
  {
    id: 'settings',
    label: 'Paramètres',
    icon: Cog,
    items: [
      { to: '/gmail-config', icon: Mail, label: 'Gmail' },
      { to: '/admin', icon: Settings, label: 'Admin' },
      { to: '/tutorial', icon: HelpCircle, label: 'Aide' },
    ]
  },
];

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
              ? "bg-primary/15 text-primary border border-primary/20" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <category.icon className="h-4 w-4" />
            <span>{category.label}</span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pl-4 mt-1 space-y-0.5 py-1 ml-3 border-l-2 border-muted">
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
                  "hover:bg-muted",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm font-medium" 
                    : "text-foreground/70 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, profile, roles } = useAuth();
  
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const newOpenState: Record<string, boolean> = {};
    navCategories.forEach(cat => {
      const hasActiveItem = cat.items.some(item => 
        location.pathname === item.to || 
        (item.to !== '/' && location.pathname.startsWith(item.to))
      );
      newOpenState[cat.id] = openCategories[cat.id] ?? hasActiveItem;
    });
    if (!Object.values(newOpenState).some(v => v)) {
      newOpenState['dashboard'] = true;
    }
    setOpenCategories(newOpenState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

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
      <div className="pt-2 border-t border-border/50 space-y-1">
        <NavLink
          to="/profile"
          onClick={onItemClick}
          className={cn(
            "group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
            location.pathname === '/profile'
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-all duration-300">
            <User className="h-4 w-4 flex-shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.display_name || user?.email?.split('@')[0] || 'Profil'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {roles.length > 0 ? roles.map(r => r === 'admin' ? 'Admin' : 'Utilisateur').join(', ') : 'Utilisateur'}
            </p>
          </div>
        </NavLink>

        <button
          onClick={handleSignOut}
          className="w-full group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <div className="p-1.5 rounded-lg bg-muted group-hover:bg-destructive/20 transition-all duration-300">
            <LogOut className="h-4 w-4 flex-shrink-0" />
          </div>
          <span className="font-medium text-sm">Déconnexion</span>
        </button>
      </div>
    </nav>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b border-border bg-background/95 backdrop-blur-xl">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="relative overflow-hidden rounded-xl hover:bg-primary/10 transition-all duration-300"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="w-80 p-0 bg-background/95 backdrop-blur-xl border-r border-border overflow-y-auto"
        >
          <div className="flex flex-col min-h-full">
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Registre</h1>
                  <p className="text-xs text-muted-foreground">Incidents & Audit</p>
                </div>
              </div>
            </div>
            
            <NavContent onItemClick={() => setOpen(false)} />
            
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">Version simplifiée</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Registre</h1>
          <p className="text-[10px] text-muted-foreground">Factuel</p>
        </div>
      </div>
      
      <ThemeToggle />
    </header>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-background/50 backdrop-blur-xl">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Registre</h1>
            <p className="text-xs text-muted-foreground">Incidents & Audit</p>
          </div>
        </div>
      </div>
      
      <NavContent />
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Thème</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
