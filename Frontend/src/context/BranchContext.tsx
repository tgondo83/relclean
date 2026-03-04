import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";

export interface Branch {
  id?: string;
  _id?: string;
  name: string;
  prefix?: string;
  address?: string;
  phone?: string;
  active?: boolean;
}

interface BranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void;
  confirmBranch: (branch: Branch) => void;
  branchConfirmed: boolean;
  isLoading: boolean;
  getBranchId: (branch: Branch | null | undefined) => string;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const STORAGE_KEY = "selectedBranchId";
export const BRANCH_SESSION_KEY = "branch_session_confirmed";

export const getBranchId = (branch: Branch | null | undefined): string => {
  if (!branch) return "";
  return branch._id || branch.id || "";
};

const normalizeBranches = (input: unknown): Branch[] => {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;

      const id = typeof obj.id === "string" ? obj.id : undefined;
      const _id = typeof obj._id === "string" ? obj._id : undefined;
      const name = typeof obj.name === "string" ? obj.name : "";
      if (!name) return null;

      return {
        id: id || _id,
        _id,
        name,
        prefix: typeof obj.prefix === "string" ? obj.prefix : undefined,
        address: typeof obj.address === "string" ? obj.address : undefined,
        phone: typeof obj.phone === "string" ? obj.phone : undefined,
        active: typeof obj.active === "boolean" ? obj.active : undefined,
      } as Branch;
    })
    .filter((b): b is Branch => b !== null);
};

const hasValidMongoId = (branch: Branch): boolean => {
  const id = branch._id || branch.id;
  // Accept any non-empty string ID (not just strict 24-char hex)
  return typeof id === "string" && id.trim().length > 0;
};

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchConfirmed, setBranchConfirmed] = useState(
    () => sessionStorage.getItem(BRANCH_SESSION_KEY) === "true"
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await api.getBranches();
        const responseData = data as { branches?: unknown[] } | undefined;
        if (responseData?.branches) {
          const normalized = normalizeBranches(responseData.branches);
          const activeBranches = normalized.filter((b) => b.active !== false && hasValidMongoId(b));
          setBranches(activeBranches);

          // Restore previously selected branch from localStorage
          const savedBranchId = localStorage.getItem(STORAGE_KEY);
          if (savedBranchId) {
            const savedBranch = activeBranches.find(
              (b) => getBranchId(b) === savedBranchId
            );
            if (savedBranch) {
              setSelectedBranch(savedBranch);
              setIsLoading(false);
              return;
            }
          }

          // Default to first branch if none saved
          if (activeBranches.length > 0) {
            setSelectedBranch(activeBranches[0]);
            localStorage.setItem(STORAGE_KEY, getBranchId(activeBranches[0]));
          }
        }
      } catch (error) {
        console.error("Failed to fetch branches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, []);

  // When the user logs out, reset the confirmed state and reload branches
  // so the next login always gets a fresh branch list.
  useEffect(() => {
    const handleLogout = () => {
      setBranchConfirmed(false);
      // Re-fetch so the branch list is fresh for the next session
      const refetch = async () => {
        try {
          const { data } = await api.getBranches();
          const responseData = data as { branches?: unknown[] } | undefined;
          if (responseData?.branches) {
            const normalized = normalizeBranches(responseData.branches);
            const activeBranches = normalized.filter(
              (b) => b.active !== false && hasValidMongoId(b)
            );
            setBranches(activeBranches);
          }
        } catch {
          // silent — branches already in memory as fallback
        }
      };
      refetch();
    };

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const handleSetSelectedBranch = (branch: Branch | null) => {
    setSelectedBranch(branch);
    if (branch) {
      localStorage.setItem(STORAGE_KEY, getBranchId(branch));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const confirmBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    localStorage.setItem(STORAGE_KEY, getBranchId(branch));
    sessionStorage.setItem(BRANCH_SESSION_KEY, "true");
    setBranchConfirmed(true);
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        setSelectedBranch: handleSetSelectedBranch,
        confirmBranch,
        branchConfirmed,
        isLoading,
        getBranchId,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
};
