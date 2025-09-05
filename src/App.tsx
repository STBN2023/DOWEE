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
import { UserProvider } from "./context/UserContext";
import AdminProjects from "./pages/AdminProjects";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Debug from "./pages/Debug";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <UserProvider>
          <RoleProvider>
            <BrowserRouter>
              <Header />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
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
                  path="/admin/projects"
                  element={
                    <ProtectedRoute>
                      <AdminProjects />
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
        </UserProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;