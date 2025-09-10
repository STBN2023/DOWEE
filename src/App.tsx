import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Header from "./components/Header";
import PlanningPage from "./pages/Planning";
import Dashboards from "./pages/Dashboards";
import { RoleProvider } from "./context/RoleContext";
import AdminProjects from "./pages/AdminProjects";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Debug from "./pages/Debug";
import Admin from "./pages/Admin";
import AdminEmployees from "./pages/AdminEmployees";
import AdminClients from "./pages/AdminClients";
import AdminReferences from "./pages/AdminReferences";
import AdminTariffs from "./pages/AdminTariffs";
import Today from "./pages/Today";
import Daily from "./pages/Daily";
import ReportsChanges from "./pages/ReportsChanges";
import ProfitabilityClients from "./pages/ProfitabilityClients";
import ProfitabilityProjects from "./pages/ProfitabilityProjects";
import ExitValidationGuard from "./components/ExitValidationGuard";
import AdminInternalCosts from "./pages/AdminInternalCosts";
import AdminLLM from "./pages/AdminLLM";
import { TickerProvider } from "./components/ticker/TickerProvider";
import TickerBar from "./components/ticker/TickerBar";
import { TickerSettingsProvider } from "./context/TickerSettingsContext";
import TickerSettingsPage from "./pages/TickerSettings";
import ChatLauncher from "./components/bot/ChatLauncher";
import AdminRag from "./pages/AdminRag";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RoleProvider>
          <TickerSettingsProvider>
            <TickerProvider>
              <BrowserRouter>
                <ExitValidationGuard />
                <Header />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/today"
                    element={
                      <ProtectedRoute>
                        <Today />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/day"
                    element={
                      <ProtectedRoute>
                        <Daily />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/planning"
                    element={
                      <ProtectedRoute>
                        <PlanningPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboards"
                    element={
                      <ProtectedRoute>
                        <Dashboards />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports/changes"
                    element={
                      <ProtectedRoute>
                        <ReportsChanges />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profitability/clients"
                    element={
                      <ProtectedRoute>
                        <ProfitabilityClients />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profitability/projects"
                    element={
                      <ProtectedRoute>
                        <ProfitabilityProjects />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <Admin />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/employees"
                    element={
                      <ProtectedRoute>
                        <AdminEmployees />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/clients"
                    element={
                      <ProtectedRoute>
                        <AdminClients />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/projects"
                    element={
                      <ProtectedRoute>
                        <AdminProjects />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/tariffs"
                    element={
                      <ProtectedRoute>
                        <AdminTariffs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/internal-costs"
                    element={
                      <ProtectedRoute>
                        <AdminInternalCosts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/references"
                    element={
                      <ProtectedRoute>
                        <AdminReferences />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/llm"
                    element={
                      <ProtectedRoute>
                        <AdminLLM />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/ticker"
                    element={
                      <ProtectedRoute>
                        <TickerSettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/rag"
                    element={
                      <ProtectedRoute>
                        <AdminRag />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/debug"
                    element={
                      <ProtectedRoute>
                        <Debug />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>

                {/* Chatbot : rendu direct, sans wrapper transform */}
                <ChatLauncher />

                <TickerBar />
              </BrowserRouter>
            </TickerProvider>
          </TickerSettingsProvider>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;