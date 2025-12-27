import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy loaded pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Journal = lazy(() => import("./pages/Journal"));
const Incidents = lazy(() => import("./pages/Incidents"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail"));
const EditIncident = lazy(() => import("./pages/EditIncident"));
const NewIncident = lazy(() => import("./pages/NewIncident"));
const IAAuditeur = lazy(() => import("./pages/IAAuditeur"));
const EmailsInbox = lazy(() => import("./pages/EmailsInbox"));
const Exports = lazy(() => import("./pages/Exports"));
const Admin = lazy(() => import("./pages/Admin"));
const GmailConfig = lazy(() => import("./pages/GmailConfig"));
const SheetsConfig = lazy(() => import("./pages/SheetsConfig"));
const AuditDashboard = lazy(() => import("./pages/AuditDashboard"));
const EmailsAnalyzed = lazy(() => import("./pages/EmailsAnalyzed"));
const ViolationsDashboard = lazy(() => import("./pages/ViolationsDashboard"));
const Attachments = lazy(() => import("./pages/Attachments"));
const AnalysisPipeline = lazy(() => import("./pages/AnalysisPipeline"));
const IncidentsTimeline = lazy(() => import("./pages/IncidentsTimeline"));
const IATraining = lazy(() => import("./pages/IATraining"));
const SwipeTraining = lazy(() => import("./pages/SwipeTraining"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const ControlCenter = lazy(() => import("./pages/ControlCenter"));
const SystemAdmin = lazy(() => import("./pages/SystemAdmin"));
const Profile = lazy(() => import("./pages/Profile"));
const SixMonthPlan = lazy(() => import("./pages/SixMonthPlan"));
const WeeklyDashboard = lazy(() => import("./pages/WeeklyDashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

// Page loading skeleton
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-1/2 mx-auto" />
      <div className="space-y-2 pt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="registre-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public route */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected routes */}
              <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
              <Route path="/control-center" element={<AuthGuard><ControlCenter /></AuthGuard>} />
              <Route path="/journal" element={<AuthGuard><Journal /></AuthGuard>} />
              <Route path="/incidents" element={<AuthGuard><Incidents /></AuthGuard>} />
              <Route path="/incidents/:id" element={<AuthGuard><IncidentDetail /></AuthGuard>} />
              <Route path="/incidents-timeline" element={<AuthGuard><IncidentsTimeline /></AuthGuard>} />
              <Route path="/incidents/:id/edit" element={<AuthGuard><EditIncident /></AuthGuard>} />
              <Route path="/nouveau" element={<AuthGuard><NewIncident /></AuthGuard>} />
              <Route path="/ia-auditeur" element={<AuthGuard><IAAuditeur /></AuthGuard>} />
              <Route path="/emails" element={<AuthGuard><EmailsInbox /></AuthGuard>} />
              <Route path="/exports" element={<AuthGuard><Exports /></AuthGuard>} />
              <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />
              <Route path="/gmail-config" element={<AuthGuard><GmailConfig /></AuthGuard>} />
              <Route path="/sheets-config" element={<AuthGuard><SheetsConfig /></AuthGuard>} />
              <Route path="/emails-analyzed" element={<AuthGuard><EmailsAnalyzed /></AuthGuard>} />
              <Route path="/violations" element={<AuthGuard><ViolationsDashboard /></AuthGuard>} />
              <Route path="/attachments" element={<AuthGuard><Attachments /></AuthGuard>} />
              <Route path="/analysis-pipeline" element={<AuthGuard><AnalysisPipeline /></AuthGuard>} />
              <Route path="/audit" element={<AuthGuard><AuditDashboard /></AuthGuard>} />
              <Route path="/ia-training" element={<AuthGuard><IATraining /></AuthGuard>} />
              <Route path="/swipe-training" element={<AuthGuard><SwipeTraining /></AuthGuard>} />
              <Route path="/tutorial" element={<AuthGuard><Tutorial /></AuthGuard>} />
              <Route path="/system-admin" element={<AuthGuard><SystemAdmin /></AuthGuard>} />
              <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
              <Route path="/plan-6-mois" element={<AuthGuard><SixMonthPlan /></AuthGuard>} />
              <Route path="/weekly-dashboard" element={<AuthGuard><WeeklyDashboard /></AuthGuard>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
