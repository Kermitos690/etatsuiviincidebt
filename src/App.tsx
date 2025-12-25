import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import NewIncident from "./pages/NewIncident";
import IAAuditeur from "./pages/IAAuditeur";
import EmailsInbox from "./pages/EmailsInbox";
import Exports from "./pages/Exports";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
