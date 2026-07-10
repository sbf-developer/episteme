import { createContext, useContext, useCallback, useState, type ReactNode } from "react";

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 224;
const COLLAPSED_WIDTH = 52;

type SidebarContextType = {
  width: number;
  collapsed: boolean;
  effectiveWidth: number;
  setWidth: (w: number) => void;
  toggleCollapsed: () => void;
  minWidth: number;
  maxWidth: number;
  collapsedWidth: number;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [width, setWidthState] = useState(() => {
    const saved = localStorage.getItem("sidebar-width");
    const parsed = saved ? Number(saved) : DEFAULT_WIDTH;
    if (!Number.isFinite(parsed)) return DEFAULT_WIDTH;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed));
  });
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );

  const setWidth = useCallback((w: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));
    setWidthState(clamped);
    localStorage.setItem("sidebar-width", String(clamped));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const effectiveWidth = collapsed ? COLLAPSED_WIDTH : width;

  return (
    <SidebarContext.Provider
      value={{
        width,
        collapsed,
        effectiveWidth,
        setWidth,
        toggleCollapsed,
        minWidth: MIN_WIDTH,
        maxWidth: MAX_WIDTH,
        collapsedWidth: COLLAPSED_WIDTH,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
