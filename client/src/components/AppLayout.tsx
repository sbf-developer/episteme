import { Outlet, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { SidebarNavProvider } from "@/context/SidebarNavContext";
import { Sidebar } from "@/components/Sidebar";

function LayoutShell() {
  const { openMobile } = useSidebar();

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <header className="relative flex h-11 shrink-0 items-center justify-center px-3 md:hidden">
        <button
          type="button"
          onClick={openMobile}
          aria-label="Open menu"
          className="absolute left-2 rounded-full p-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>
        <span className="text-sm font-medium tracking-[0.08em] text-[var(--color-text-secondary)]">
          Dasein
        </span>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!user.onboardingCompletedAt) return <Navigate to="/onboarding" replace />;

  return (
    <SidebarNavProvider>
      <SidebarProvider>
        <LayoutShell />
      </SidebarProvider>
    </SidebarNavProvider>
  );
}
