import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useLogo } from "@/hooks/useLogo";
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Users,
  Settings,
  Shield,
  Printer,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/",           pageKey: "dashboard" },
  { label: "New Order", icon: PlusCircle,       path: "/orders/new", pageKey: "new-order" },
  { label: "Orders",    icon: ShoppingCart,      path: "/orders",    pageKey: "orders" },
  { label: "Customers", icon: Users,             path: "/customers", pageKey: "customers" },
  { label: "Metrics",   icon: BarChart2,         path: "/metrics",   pageKey: "metrics" },
  { label: "Users",     icon: Users,             path: "/users",     pageKey: "users" },
  { label: "Settings",  icon: Settings,          path: "/settings",  pageKey: "settings" },
  { label: "Admin",     icon: Shield,            path: "/admin",     pageKey: "admin" },
  { label: "Hardware",  icon: Printer,           path: "/hardware",  pageKey: "hardware" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { logo } = useLogo();
  const [collapsed, setCollapsed] = useState(false);

  // Cashier (role === "user") only sees pages granted in their permissions.
  // Fall back to default set if permissions were never stored (e.g. legacy
  // accounts or tokens issued before the permissions feature was added).
  const DEFAULT_USER_PAGES = ["dashboard", "new-order", "orders", "customers"];
  const visibleNavItems =
    user?.role === "user"
      ? navItems.filter((item) => {
          const allowedPages =
            user.permissions?.pages && user.permissions.pages.length > 0
              ? user.permissions.pages
              : DEFAULT_USER_PAGES;
          return allowedPages.includes(item.pageKey);
        })
      : navItems;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={cn(
        "sidebar-gradient flex flex-col h-screen sticky top-0 transition-all duration-300 z-30",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex flex-col items-center justify-center border-b border-sidebar-border px-3 py-3 gap-1",
        collapsed ? "h-16" : logo ? "h-24" : "h-16 flex-row gap-2"
      )}>
        {logo ? (
          <>
            <img
              src={logo}
              alt="Logo"
              className={cn(
                "object-contain shrink-0",
                collapsed ? "h-8 max-w-[48px]" : "h-12 max-w-[160px]"
              )}
            />
            {!collapsed && (
              <span className="text-sidebar-primary font-bold text-sm tracking-tight text-center leading-tight">
                RelClean
              </span>
            )}
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <span className="text-accent-foreground font-extrabold text-sm">R</span>
            </div>
            {!collapsed && (
              <span className="text-sidebar-primary font-bold text-lg tracking-tight">
                RelClean
              </span>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-sidebar-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary truncate">{user.username}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <div className="flex">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-2 text-sidebar-foreground hover:text-red-400 transition-colors",
              collapsed ? "justify-center flex-1 py-3" : "px-4 py-3 flex-1"
            )}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center px-3 py-3 text-sidebar-foreground hover:text-sidebar-primary transition-colors border-l border-sidebar-border"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
