import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Target,
  CheckSquare,
  GitBranch,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/notes", icon: FileText, label: "Notes" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/actions", icon: CheckSquare, label: "Actions" },
  { to: "/graph", icon: GitBranch, label: "Graph" },
  { to: "/ai", icon: Sparkles, label: "AI" },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
      <div className="px-5 py-5">
        <h1 className="text-base font-semibold tracking-tight">Episteme</h1>
        <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">Personal ontology</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-white font-medium text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:bg-white/60 hover:text-[var(--color-text)]"
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2">
          {user?.image ? (
            <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-border)] text-xs font-medium">
              {user?.name?.[0] ?? user?.email?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
            <p className="truncate text-xs text-[var(--color-text-tertiary)]">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-white hover:text-[var(--color-text)]"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
