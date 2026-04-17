import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BranchProvider } from "@/context/BranchContext";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense } from "react";

// Eagerly-loaded pages (critical path)
import LoginPage from "./pages/LoginPage";
import BranchSelectPage from "./pages/BranchSelectPage";
import Index from "./pages/Index";

// Lazy-loaded pages (code-split)
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const NewOrderPage = lazy(() => import("./pages/NewOrderPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const AddCustomerPage = lazy(() => import("./pages/AddCustomerPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const HardwarePage = lazy(() => import("./pages/HardwarePage"));
const MetricsPage = lazy(() => import("./pages/MetricsPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const BulkUpdatePage = lazy(() => import("./pages/BulkUpdatePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,       // Data considered fresh for 30s
      gcTime: 5 * 60 * 1000,      // Cache kept for 5 min
      refetchOnWindowFocus: false, // Don't refetch when user tabs back
      retry: 1,                   // Only retry once on failure
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BranchProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/select-branch" element={<ProtectedRoute><BranchSelectPage /></ProtectedRoute>} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Index />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/new" element={<NewOrderPage />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/add" element={<AddCustomerPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/bulk-update" element={<BulkUpdatePage />} />
                  <Route path="/hardware" element={<HardwarePage />} />
                  <Route path="/metrics" element={<MetricsPage />} />
                  <Route path="/users" element={<UserManagementPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </BranchProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
