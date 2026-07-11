import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  DEFAULT_SIDEBAR_LAYOUT,
  type SidebarLayout,
} from "@/lib/sidebar-nav";

type SidebarNavContextValue = {
  layout: SidebarLayout;
  saving: boolean;
  error: string | null;
  updateLayout: (layout: SidebarLayout) => void;
  resetLayout: () => void;
};

const SidebarNavContext = createContext<SidebarNavContextValue | null>(null);

export function SidebarNavProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<SidebarLayout>(DEFAULT_SIDEBAR_LAYOUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveGen = useRef(0);

  useEffect(() => {
    api.settings
      .getSidebar()
      .then(setLayout)
      .catch(() => setLayout(DEFAULT_SIDEBAR_LAYOUT));
  }, []);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const persistLayout = useCallback((next: SidebarLayout) => {
    setLayout(next);
    setError(null);
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      const gen = ++saveGen.current;
      try {
        const saved = await api.settings.updateSidebar(next);
        if (gen !== saveGen.current) return;
        setLayout(saved);
      } catch (err) {
        if (gen !== saveGen.current) return;
        setError(err instanceof Error ? err.message : "Could not save sidebar");
      } finally {
        if (gen === saveGen.current) setSaving(false);
      }
    }, 400);
  }, []);

  const resetLayout = useCallback(() => {
    persistLayout(DEFAULT_SIDEBAR_LAYOUT);
  }, [persistLayout]);

  return (
    <SidebarNavContext.Provider
      value={{
        layout,
        saving,
        error,
        updateLayout: persistLayout,
        resetLayout,
      }}
    >
      {children}
    </SidebarNavContext.Provider>
  );
}

export function useSidebarNav() {
  const ctx = useContext(SidebarNavContext);
  if (!ctx) throw new Error("useSidebarNav must be used within SidebarNavProvider");
  return ctx;
}
