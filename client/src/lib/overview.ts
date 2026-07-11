export const OVERVIEW_SECTION_LABELS: Record<string, string> = {
  "ask-ai": "Ask AI",
  "do-list": "Do-list",
  kpis: "KPIs",
  upcoming: "Upcoming",
  goals: "Goals",
  notes: "Notes",
};

export type OverviewSectionId = keyof typeof OVERVIEW_SECTION_LABELS;

export type OverviewSectionConfig = {
  id: OverviewSectionId;
  visible: boolean;
};

export type OverviewLayout = {
  sections: OverviewSectionConfig[];
};
