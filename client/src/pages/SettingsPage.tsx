import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Target,
  Gauge,
  ListTodo,
  Calendar,
  GitBranch,
  FolderUp,
  MessageSquare,
  User,
  Check,
  FileType,
  PanelLeft,
} from "lucide-react";
import { api, type ExportSection, type ExportPreview } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { OverviewCustomize } from "@/components/OverviewCustomize";
import { useSidebarNav } from "@/context/SidebarNavContext";
import { SIDEBAR_NAV_LABELS } from "@/lib/sidebar-nav";

const SECTION_META: {
  id: ExportSection;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    id: "profile",
    label: "Profile & preferences",
    description: "Name, email, AI instructions, home and sidebar layout",
    icon: User,
  },
  {
    id: "notes",
    label: "Notes",
    description: "All notes as JSON and readable Markdown",
    icon: FileText,
  },
  {
    id: "goals",
    label: "Goals",
    description: "Titles, descriptions, status, dates",
    icon: Target,
  },
  {
    id: "kpis",
    label: "KPIs",
    description: "Metrics, targets, and progress",
    icon: Gauge,
  },
  {
    id: "do-list",
    label: "Do-list",
    description: "Open and completed tasks",
    icon: ListTodo,
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Events and schedules",
    icon: Calendar,
  },
  {
    id: "graph",
    label: "Knowledge graph",
    description: "Connections and node positions",
    icon: GitBranch,
  },
  {
    id: "uploads",
    label: "Uploaded documents",
    description: "Original files plus metadata",
    icon: FolderUp,
  },
  {
    id: "ai-chats",
    label: "AI chats",
    description: "Threads and messages as JSON and Markdown",
    icon: MessageSquare,
  },
];

const ALL_SECTIONS = SECTION_META.map((s) => s.id);

function countLabel(count: number, section: ExportSection) {
  if (section === "profile") return "Account";
  if (count === 0) return "Empty";
  if (count === 1) return "1 item";
  return `${count} items`;
}

export function SettingsPage() {
  const {
    layout: sidebarLayout,
    saving: savingSidebar,
    error: sidebarError,
    updateLayout: updateSidebarLayout,
    resetLayout: resetSidebarLayout,
  } = useSidebarNav();
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<ExportSection>>(new Set(ALL_SECTIONS));
  const [exporting, setExporting] = useState<"zip" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingPreview(true);
    setPreviewError(null);
    api.settings
      .getExportPreview()
      .then(setPreview)
      .catch((e) => setPreviewError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoadingPreview(false));
  }, []);

  const allSelected = selected.size === ALL_SECTIONS.length;
  const noneSelected = selected.size === 0;

  const selectedSummary = useMemo(() => {
    if (!preview || noneSelected) return null;
    const total = [...selected].reduce((sum, id) => sum + (preview.sections[id] ?? 0), 0);
    return `${selected.size} section${selected.size === 1 ? "" : "s"} · ${total} total items`;
  }, [preview, selected, noneSelected]);

  const toggle = (id: ExportSection) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setExportError(null);
  };

  const selectAll = () => {
    setSelected(new Set(ALL_SECTIONS));
    setExportError(null);
  };

  const deselectAll = () => {
    setSelected(new Set());
    setExportError(null);
  };

  const downloadZip = async () => {
    if (noneSelected) return;
    setExporting("zip");
    setExportError(null);
    try {
      await api.settings.downloadExport([...selected]);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    if (noneSelected) return;
    setExporting("pdf");
    setExportError(null);
    try {
      await api.settings.downloadExportPdf([...selected]);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-xl font-medium tracking-tight text-[var(--color-text)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Manage your account and data.
        </p>
      </header>

      <section className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
              <PanelLeft size={18} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-medium text-[var(--color-text)]">Sidebar menu</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Reorder and show or hide items in the left navigation. Settings always stays at the
                bottom.
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 sm:px-6">
          {sidebarError && <p className="mb-3 text-sm text-red-600">{sidebarError}</p>}
          <OverviewCustomize
            layout={sidebarLayout}
            labels={SIDEBAR_NAV_LABELS}
            onChange={updateSidebarLayout}
            onReset={resetSidebarLayout}
            saving={savingSidebar}
            hint="Drag to reorder. Hide pages you don't use — Settings is always available."
          />
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
              <Download size={18} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-medium text-[var(--color-text)]">Download your data</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Choose what to include, then download as a ZIP (full data + files) or a combined
                PDF (readable summary).
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
              Include
            </p>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                onClick={selectAll}
                disabled={allSelected || loadingPreview}
                className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={deselectAll}
                disabled={noneSelected || loadingPreview}
                className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>

          {previewError && (
            <p className="mb-3 text-sm text-red-600">{previewError}</p>
          )}

          <ul className="space-y-1">
            {SECTION_META.map(({ id, label, description, icon: Icon }) => {
              const isOn = selected.has(id);
              const count = preview?.sections[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    disabled={loadingPreview || !!exporting}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-3 text-left transition-colors ${
                      isOn
                        ? "bg-white shadow-sm"
                        : "hover:bg-[var(--color-border-subtle)]"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isOn
                          ? "border-[var(--color-text)] bg-[var(--color-text)] text-white"
                          : "border-[var(--color-border)] bg-white"
                      }`}
                    >
                      {isOn && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    <Icon
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-[var(--color-text-tertiary)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[var(--color-text)]">
                        {label}
                      </span>
                      <span className="block text-xs text-[var(--color-text-tertiary)]">
                        {description}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">
                      {loadingPreview ? "…" : countLabel(count ?? 0, id)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-[var(--color-border)] px-5 py-4 sm:px-6">
          {selectedSummary && (
            <p className="mb-3 text-xs text-[var(--color-text-tertiary)]">{selectedSummary}</p>
          )}
          {exportError && <p className="mb-3 text-sm text-red-600">{exportError}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="subtle"
              onClick={downloadZip}
              disabled={!!exporting || noneSelected || loadingPreview}
              className="w-full sm:w-auto"
            >
              <Download size={15} strokeWidth={1.75} />
              {exporting === "zip" ? "Preparing ZIP…" : "Download ZIP"}
            </Button>
            <Button
              variant="subtle"
              onClick={downloadPdf}
              disabled={!!exporting || noneSelected || loadingPreview}
              className="w-full sm:w-auto"
            >
              <FileType size={15} strokeWidth={1.75} />
              {exporting === "pdf" ? "Preparing PDF…" : "Download PDF"}
            </Button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-text-tertiary)]">
            ZIP includes JSON, Markdown, and original files. PDF combines selected sections into one
            readable document. Generated on demand — nothing is stored after download.
          </p>
        </div>
      </section>
    </div>
  );
}
