import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { BreakpointProvider } from "@/providers/BreakpointProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TeamManagementPreview from "./pages/TeamManagementPreview";
import CommunicationPreview from "./pages/CommunicationPreview";
import TeamOverviewPreview from "./pages/TeamOverviewPreview";
import MatchOverviewPreview from "./pages/MatchOverviewPreview";
import TeamAvailabilityPreview from "./pages/TeamAvailabilityPreview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PasswordChangeDialog />
      <BreakpointProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Index />} />
            <Route path="/preview/teams" element={<TeamManagementPreview />} />
            <Route path="/preview/communication" element={<CommunicationPreview />} />
            <Route path="/preview/team-overview" element={<TeamOverviewPreview />} />
            <Route path="/preview/match-overview" element={<MatchOverviewPreview />} />
            <Route path="/team-availability" element={<TeamAvailabilityPreview />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BreakpointProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
