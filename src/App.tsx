import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import EditIncident from "./pages/EditIncident";
import NewIncident from "./pages/NewIncident";
import IAAuditeur from "./pages/IAAuditeur";
import EmailsInbox from "./pages/EmailsInbox";
import Exports from "./pages/Exports";
import Admin from "./pages/Admin";
import GmailConfig from "./pages/GmailConfig";
import SheetsConfig from "./pages/SheetsConfig";
import AuditDashboard from "./pages/AuditDashboard";
import EmailsAnalyzed from "./pages/EmailsAnalyzed";
import ViolationsDashboard from "./pages/ViolationsDashboard";
import Attachments from "./pages/Attachments";
import AnalysisPipeline from "./pages/AnalysisPipeline";
import IncidentsTimeline from "./pages/IncidentsTimeline";
import IATraining from "./pages/IATraining";
import SwipeTraining from "./pages/SwipeTraining";
import Tutorial from "./pages/Tutorial";
import ControlCenter from "./pages/ControlCenter";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="registre-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
