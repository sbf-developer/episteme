import { z } from "zod";

export const SIDEBAR_NAV_IDS = [
  "home",
  "calendar",
  "notes",
  "documents",
  "goals",
  "kpis",
  "do-list",
  "graph",
  "ai",
] as const;

export type SidebarNavId = (typeof SIDEBAR_NAV_IDS)[number];

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

const sectionSchema = z.object({
  id: z.string(),
  visible: z.boolean(),
});

export const sidebarLayoutSchema = z.object({
  sections: z.array(sectionSchema).min(1).max(20),
});

export function normalizeSidebarLayout(input: unknown): SidebarLayout {
  const parsed = sidebarLayoutSchema.safeParse(input);
  const ordered: SidebarNavConfig[] = [];
  const seen = new Set<SidebarNavId>();

  if (parsed.success) {
    for (const section of parsed.data.sections) {
      if (!SIDEBAR_NAV_IDS.includes(section.id as SidebarNavId)) continue;
      if (seen.has(section.id as SidebarNavId)) continue;
      seen.add(section.id as SidebarNavId);
      ordered.push(section as SidebarNavConfig);
    }
  }

  for (const fallback of DEFAULT_SIDEBAR_LAYOUT.sections) {
    if (!seen.has(fallback.id)) {
      ordered.push(fallback);
      seen.add(fallback.id);
    }
  }

  return { sections: ordered };
}
