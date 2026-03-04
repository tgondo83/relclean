import { MapPin, ChevronDown, ArrowLeftRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranch, getBranchId } from "@/context/BranchContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const AppHeader = ({ title }: { title: string }) => {
  const { branches, selectedBranch, confirmBranch, isLoading } = useBranch();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const canChangeBranch = user?.role === "admin" || user?.role === "manager";

  const handleBranchChange = (action: () => void) => {
    if (!canChangeBranch) {
      logout();
      navigate("/login", { replace: true });
      return;
    }
    action();
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-lg font-bold text-foreground">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
          <MapPin className="w-4 h-4 text-accent" />
          {isLoading ? "Loading..." : selectedBranch?.name || "Select Branch"}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {branches.map((branch) => (
            <DropdownMenuItem
              key={getBranchId(branch)}
              onClick={() => handleBranchChange(() => confirmBranch(branch))}
              className={getBranchId(branch) === getBranchId(selectedBranch) ? "bg-secondary" : ""}
            >
              {branch.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleBranchChange(() => navigate("/select-branch"))}>
            <ArrowLeftRight className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            Change Branch…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AppHeader;
