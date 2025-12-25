import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import NewIncident from "./pages/NewIncident";
import IAAuditeur from "./pages/IAAuditeur";
import EmailsInbox from "./pages/EmailsInbox";
import Exports from "./pages/Exports";
import Admin from "./pages/Admin";
import GmailConfig from "./pages/GmailConfig";
import SheetsConfig from "./pages/SheetsConfig";
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route path="/nouveau" element={<NewIncident />} />
            <Route path="/ia-auditeur" element={<IAAuditeur />} />
            <Route path="/emails" element={<EmailsInbox />} />
            <Route path="/exports" element={<Exports />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/gmail-config" element={<GmailConfig />} />
            <Route path="/sheets-config" element={<SheetsConfig />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
