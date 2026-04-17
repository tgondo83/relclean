import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLogo } from "@/hooks/useLogo";
import { useBranch, getBranchId, Branch } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

const BranchSelectPage = () => {
  usePageTitle("Select Branch");
  const { branches, selectedBranch, confirmBranch, branchConfirmed, isLoading, refreshBranches } = useBranch();
  const { user, logout } = useAuth();
  const { logo } = useLogo();
  const navigate = useNavigate();

  const canChangeBranch = user?.role === "admin" || user?.role === "manager";

  // Always refresh branches when this page mounts (e.g. after login)
  useEffect(() => {
    refreshBranches();
  }, []);

  // Guard: non-privileged user who already has a confirmed branch has no
  // reason to be on this page — log them out. Must be in useEffect so it
  // doesn't run during render (React rule: no side-effects during render).
  useEffect(() => {
    if (branchConfirmed && user && !canChangeBranch) {
      logout();
      navigate("/login", { replace: true });
    }
  }, [branchConfirmed, user, canChangeBranch, logout, navigate]);

  const handleSelect = (branch: Branch) => {
    confirmBranch(branch);
    navigate("/", { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8 text-center space-y-2">
        <div className="flex flex-col items-center gap-1 mb-4">
          {logo ? (
            <>
              <img
                src={logo}
                alt="Company logo"
                className="h-20 max-w-[200px] object-contain"
              />
              <span className="text-base font-bold text-foreground tracking-tight">RelClean</span>
            </>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-extrabold text-xl">R</span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">Select Your Branch</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back,{" "}
          <span className="font-medium text-foreground">{user?.username}</span>.
          Choose the branch you are working in today.
        </p>
        {selectedBranch && (
          <p className="text-xs text-muted-foreground">
            Last session:{" "}
            <span className="font-medium text-foreground">{selectedBranch.name}</span>
          </p>
        )}
      </div>

      {/* Branch cards */}
      <div className="w-full max-w-2xl space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading branches…</div>
        ) : branches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No branches available. Contact your administrator.
          </div>
        ) : (
          branches.map((branch) => {
            const id = getBranchId(branch);
            const isCurrent = selectedBranch && getBranchId(selectedBranch) === id;

            return (
              <button
                key={id}
                className="w-full text-left group"
                onClick={() => handleSelect(branch)}
              >
                <Card
                  className={`transition-all duration-150 hover:shadow-md hover:border-primary/60 cursor-pointer ${
                    isCurrent
                      ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    {/* Left: icon + details */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        } transition-colors`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{branch.name}</span>
                          {branch.prefix && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {branch.prefix}
                            </Badge>
                          )}
                          {isCurrent && (
                            <Badge className="bg-primary/10 text-primary border-primary/30 text-xs border">
                              Last used
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                          {branch.address && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {branch.address}
                            </span>
                          )}
                          {branch.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              {branch.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: arrow / check */}
                    <div className="flex-shrink-0">
                      {isCurrent ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-10">
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
          <LogOut className="w-4 h-4 mr-1.5" /> Sign out
        </Button>
      </div>
    </div>
  );
};

export default BranchSelectPage;
