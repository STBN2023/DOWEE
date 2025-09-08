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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RoleProvider>
          <BrowserRouter>
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
                path="/admin/references"
                element={
                  <ProtectedRoute>
                    <AdminReferences />
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;