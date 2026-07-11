import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Target,
  GitBranch,
  MessageSquare,
  Calendar,
  FolderUp,
  Gauge,
  ListTodo,
  Settings,
} from "lucide-react";

export const SIDEBAR_NAV_LABELS: Record<string, string> = {
  home: "Home",
  calendar: "Calendar",
  notes: "Notes",
  documents: "Documents",
  goals: "Goals",
  kpis: "KPIs",
  "do-list": "Do-list",
  graph: "Graph",
  ai: "AI",
};

export type SidebarNavId = keyof typeof SIDEBAR_NAV_LABELS;

export type SidebarNavConfig = {
  id: SidebarNavId;
  visible: boolean;
};

export type SidebarLayout = {
  sections: SidebarNavConfig[];
};

export const DEFAULT_SIDEBAR_LAYOUT: SidebarLayout = {
  sections: [
    { id: "home", visible: true },
    { id: "calendar", visible: true },
    { id: "notes", visible: true },
    { id: "documents", visible: true },
    { id: "goals", visible: true },
    { id: "kpis", visible: true },
    { id: "do-list", visible: true },
    { id: "graph", visible: true },
    { id: "ai", visible: true },
  ],
};

export type NavItemDef = {
  id: SidebarNavId;
  to: string;
  icon: LucideIcon;
  label: string;
};

export const NAV_ITEMS: NavItemDef[] = [
  { id: "home", to: "/", icon: LayoutDashboard, label: "Home" },
  { id: "calendar", to: "/calendar", icon: Calendar, label: "Calendar" },
  { id: "notes", to: "/notes", icon: FileText, label: "Notes" },
  { id: "documents", to: "/documents", icon: FolderUp, label: "Documents" },
  { id: "goals", to: "/goals", icon: Target, label: "Goals" },
  { id: "kpis", to: "/kpis", icon: Gauge, label: "KPIs" },
  { id: "do-list", to: "/do-list", icon: ListTodo, label: "Do-list" },
  { id: "graph", to: "/graph", icon: GitBranch, label: "Graph" },
  { id: "ai", to: "/ai", icon: MessageSquare, label: "AI" },
];

export const SETTINGS_NAV_ITEM = {
  to: "/settings",
  icon: Settings,
  label: "Settings",
};

const navById = new Map(NAV_ITEMS.map((item) => [item.id, item]));

export function resolveSidebarNav(layout: SidebarLayout): NavItemDef[] {
  return layout.sections
    .filter((s) => s.visible)
    .map((s) => navById.get(s.id))
    .filter((item): item is NavItemDef => !!item);
}
