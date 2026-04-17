import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { branchConfirmed } = useBranch();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-extrabold text-lg">R</span>
          </div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Force branch selection after login, unless already on the selection page
  if (!branchConfirmed && location.pathname !== "/select-branch") {
    return <Navigate to="/select-branch" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
