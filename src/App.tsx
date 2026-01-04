import { lazy, Suspense, forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthGuard, AdminGuard } from "@/components/auth/AuthGuard";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { TutorialProvider, WelcomeTutorialModal } from "@/components/tutorial/GuidedTutorial";

// Lazy loaded pages - simplified
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Incidents = lazy(() => import("./pages/Incidents"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail"));
const EditIncident = lazy(() => import("./pages/EditIncident"));
const NewIncident = lazy(() => import("./pages/NewIncident"));
const IAAuditeur = lazy(() => import("./pages/IAAuditeur"));
const Emails = lazy(() => import("./pages/Emails"));
const Admin = lazy(() => import("./pages/Admin"));
const GmailConfig = lazy(() => import("./pages/GmailConfig"));
const Attachments = lazy(() => import("./pages/Attachments"));
const AnalysisPipeline = lazy(() => import("./pages/AnalysisPipeline"));
const IncidentsTimeline = lazy(() => import("./pages/IncidentsTimeline"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const ControlCenter = lazy(() => import("./pages/ControlCenter"));
const Profile = lazy(() => import("./pages/Profile"));
const EmailCleanup = lazy(() => import("./pages/EmailCleanup"));
const FactualDossier = lazy(() => import("./pages/FactualDossier"));
const Journal = lazy(() => import("./pages/Journal"));
const Events = lazy(() => import("./pages/Events"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ImportIncident = lazy(() => import("./pages/ImportIncident"));
const IATraining = lazy(() => import("./pages/IATraining"));
const SwipeTraining = lazy(() => import("./pages/SwipeTraining"));
const LegalConfig = lazy(() => import("./pages/LegalConfig"));
const LegalAdmin = lazy(() => import("./pages/LegalAdmin"));
const Suggestions = lazy(() => import("./pages/Suggestions"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="flex items-center justify-center min-h-screen bg-background">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-1/2 mx-auto" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  </div>
));
PageLoader.displayName = 'PageLoader';

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="registre-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <TutorialProvider>
              <WelcomeTutorialModal />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public route */}
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Protected routes - Simplified */}
                  <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
                  
                  {/* Emails - Unified */}
                  <Route path="/emails" element={<AuthGuard><Emails /></AuthGuard>} />
                  <Route path="/email-cleanup" element={<AuthGuard><EmailCleanup /></AuthGuard>} />
                  <Route path="/attachments" element={<AuthGuard><Attachments /></AuthGuard>} />
                  <Route path="/analysis-pipeline" element={<AuthGuard><AnalysisPipeline /></AuthGuard>} />
                  
                  {/* Incidents */}
                  <Route path="/suggestions" element={<AuthGuard><Suggestions /></AuthGuard>} />
                  <Route path="/incidents" element={<AuthGuard><Incidents /></AuthGuard>} />
                  <Route path="/incidents/:id" element={<AuthGuard><IncidentDetail /></AuthGuard>} />
                  <Route path="/incidents/:id/edit" element={<AuthGuard><EditIncident /></AuthGuard>} />
                  <Route path="/incidents-timeline" element={<AuthGuard><IncidentsTimeline /></AuthGuard>} />
                  <Route path="/nouveau" element={<AuthGuard><NewIncident /></AuthGuard>} />
                  
                  {/* Dossier Factuel */}
                  <Route path="/factual-dossier" element={<AuthGuard><FactualDossier /></AuthGuard>} />
                  <Route path="/events" element={<AuthGuard><Events /></AuthGuard>} />
                  <Route path="/journal" element={<AuthGuard><Journal /></AuthGuard>} />
                  <Route path="/ia-auditeur" element={<AuthGuard><IAAuditeur /></AuthGuard>} />
                  
                  {/* Settings */}
                  <Route path="/gmail-config" element={<AuthGuard><GmailConfig /></AuthGuard>} />
                  <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />
                  <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                  <Route path="/tutorial" element={<AuthGuard><Tutorial /></AuthGuard>} />
                  <Route path="/import-incident" element={<AuthGuard><ImportIncident /></AuthGuard>} />
                  <Route path="/ia-training" element={<AuthGuard><IATraining /></AuthGuard>} />
                  <Route path="/swipe-training" element={<AuthGuard><SwipeTraining /></AuthGuard>} />
                  <Route path="/legal-config" element={<AdminGuard><LegalConfig /></AdminGuard>} />
                  <Route path="/legal-admin" element={<AdminGuard><LegalAdmin /></AdminGuard>} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </TutorialProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
