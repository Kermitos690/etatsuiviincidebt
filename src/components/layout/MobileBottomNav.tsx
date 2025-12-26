import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mail, 
  AlertTriangle, 
  Sparkles,
  MoreHorizontal,
  Scale,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import React, { forwardRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const primaryNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/control-center', icon: Gauge, label: 'Contrôle' },
  { to: '/emails', icon: Mail, label: 'Emails' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
];

const moreNavSections = [
  {
    title: 'Analyse',
    items: [
      { to: '/analysis-pipeline', label: 'Pipeline IA', icon: Sparkles },
      { to: '/emails-analyzed', label: 'Emails Analysés', icon: Mail },
      { to: '/incidents-timeline', label: 'Timeline', icon: AlertTriangle },
      { to: '/violations', label: 'Violations', icon: Scale },
    ]
  },
  {
    title: 'Outils',
    items: [
      { to: '/attachments', label: 'Pièces Jointes' },
      { to: '/journal', label: 'Journal' },
      { to: '/exports', label: 'Exports PDF' },
    ]
  },
  {
    title: 'IA & Configuration',
    items: [
      { to: '/ia-auditeur', label: 'IA Auditeur' },
      { to: '/ia-training', label: 'Entraînement IA' },
      { to: '/gmail-config', label: 'Config Gmail' },
      { to: '/sheets-config', label: 'Config Sheets' },
    ]
  },
  {
    title: 'Autres',
    items: [
      { to: '/nouveau', label: 'Nouvel Incident' },
      { to: '/audit', label: 'Audit Dashboard' },
      { to: '/admin', label: 'Administration' },
      { to: '/tutorial', label: 'Tutoriel' },
    ]
  }
];

export const MobileBottomNav = forwardRef<HTMLElement, Record<string, never>>((_, ref) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isMoreActive = moreNavSections.some(section =>
    section.items.some(item =>
      location.pathname === item.to ||
      (item.to !== '/' && location.pathname.startsWith(item.to))
    )
  );

  return (
    <nav
      ref={ref}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-glass backdrop-blur-glass border-t border-glass safe-area-bottom"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {primaryNavItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-300",
                "min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-300",
                isActive && "bg-primary/20"
              )}>
                <item.icon className={cn(
                  "h-5 w-5 transition-all",
                  isActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium truncate max-w-[60px]",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}

        {/* More menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-300",
                "min-w-[60px]",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-300",
                isMoreActive && "bg-primary/20"
              )}>
                <MoreHorizontal className={cn(
                  "h-5 w-5 transition-all",
                  isMoreActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isMoreActive && "text-primary"
              )}>
                Plus
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-glass backdrop-blur-glass border-t border-glass rounded-t-3xl max-h-[80vh]"
          >
            <div className="py-4">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-semibold text-center mb-4 gradient-text">Navigation</h3>

              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6">
                  {moreNavSections.map((section, sectionIdx) => (
                    <div key={section.title}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                        {section.title}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {section.items.map((item) => {
                          const isActive = location.pathname === item.to;
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-300",
                                "text-sm font-medium",
                                isActive
                                  ? "bg-primary text-primary-foreground shadow-glow"
                                  : "bg-muted/30 text-foreground hover:bg-muted/50"
                              )}
                            >
                              {item.label}
                            </NavLink>
                          );
                        })}
                      </div>
                      {sectionIdx < moreNavSections.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';

