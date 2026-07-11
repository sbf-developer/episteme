import { useCallback, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Target,
  GitBranch,
  MessageSquare,
  LogOut,
  Calendar,
  FolderUp,
  PanelLeftClose,
  PanelLeft,
  X,
  Gauge,
  ListTodo,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { SearchBar } from "@/components/SearchBar";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/notes", icon: FileText, label: "Notes" },
  { to: "/documents", icon: FolderUp, label: "Documents" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/kpis", icon: Gauge, label: "KPIs" },
  { to: "/do-list", icon: ListTodo, label: "Do-list" },
  { to: "/graph", icon: GitBranch, label: "Graph" },
  { to: "/ai", icon: MessageSquare, label: "AI" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const {
    collapsed,
    effectiveWidth,
    isMobile,
    mobileOpen,
    setWidth,
    toggleCollapsed,
    closeMobile,
  } = useSidebar();
  const dragging = useRef(false);
  const asideRef = useRef<HTMLElement>(null);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed || isMobile) return;
      e.preventDefault();
      dragging.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [collapsed, isMobile]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !asideRef.current) return;
      const rect = asideRef.current.getBoundingClientRect();
      setWidth(e.clientX - rect.left);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [setWidth]);

  const content = (
    <>
      <div className={`flex items-center gap-2 px-4 pt-5 ${collapsed && !isMobile ? "flex-col pb-2" : "pb-4"}`}>
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium tracking-[0.08em] text-[var(--color-text-secondary)]">
              Dasein
            </span>
          </div>
        )}
        {isMobile ? (
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-white/60 hover:text-[var(--color-text)]"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-white/60 hover:text-[var(--color-text)]"
          >
            {collapsed ? <PanelLeft size={18} strokeWidth={1.75} /> : <PanelLeftClose size={18} strokeWidth={1.75} />}
          </button>
        )}
      </div>

      <div className={`px-3 ${collapsed && !isMobile ? "pb-2" : "pb-3"}`}>
        <SearchBar collapsed={collapsed && !isMobile} />
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={collapsed && !isMobile ? label : undefined}
            onClick={closeMobile}
            className={({ isActive }) =>
              `flex items-center rounded-[var(--radius-sm)] text-sm transition-colors ${
                collapsed && !isMobile ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2"
              } ${
                isActive
                  ? "bg-white font-medium text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:bg-white/60 hover:text-[var(--color-text)]"
              }`
            }
          >
            <Icon size={16} strokeWidth={1.75} className="shrink-0" />
            {(!collapsed || isMobile) && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <div
          className={`flex items-center rounded-[var(--radius-sm)] ${
            collapsed && !isMobile ? "flex-col gap-2 py-1" : "gap-2.5 px-3 py-2"
          }`}
        >
          {user?.image ? (
            <img src={user.image} alt="" className="h-7 w-7 shrink-0 rounded-full" />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-border)] text-xs font-medium">
              {user?.name?.[0] ?? user?.email?.[0] ?? "?"}
            </div>
          )}
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
              <p className="truncate text-xs text-[var(--color-text-tertiary)]">{user?.email}</p>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            className="shrink-0 rounded p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-white hover:text-[var(--color-text)]"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={closeMobile}
          />
        )}
        <aside
          ref={asideRef}
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(85vw,280px)] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] transition-transform duration-300 ease-in-out md:hidden ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside
      ref={asideRef}
      style={{ width: effectiveWidth }}
      className="relative hidden h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] transition-[width] duration-300 ease-in-out md:flex"
    >
      {content}
      {!collapsed && (
        <div
          onMouseDown={onResizeStart}
          className="group absolute -right-px top-0 z-10 h-full w-1.5 cursor-col-resize"
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-[var(--color-accent)] group-active:bg-[var(--color-accent)]" />
        </div>
      )}
    </aside>
  );
}
