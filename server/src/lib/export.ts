import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import { prisma } from "./prisma.js";
import { readStoredFile } from "./files.js";

export const EXPORT_SECTIONS = [
  "profile",
  "notes",
  "goals",
  "kpis",
  "do-list",
  "calendar",
  "graph",
  "uploads",
  "ai-chats",
] as const;

export type ExportSection = (typeof EXPORT_SECTIONS)[number];

export type ExportPreview = {
  sections: Record<ExportSection, number>;
};

const SECTION_LABELS: Record<ExportSection, string> = {
  profile: "Profile & preferences",
  notes: "Notes",
  goals: "Goals",
  kpis: "KPIs",
  "do-list": "Do-list",
  calendar: "Calendar",
  graph: "Knowledge graph",
  uploads: "Uploaded documents",
  "ai-chats": "AI chats",
};

type ExportContent = {
  exportedAt: Date;
  profile: {
    email: string;
    name: string | null;
    aiInstructions: string;
    overviewLayout: unknown;
    sidebarLayout: unknown;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
  } | null;
  notes: Awaited<ReturnType<typeof prisma.document.findMany>>;
  goals: Awaited<ReturnType<typeof prisma.goal.findMany>>;
  kpis: Awaited<ReturnType<typeof prisma.kpi.findMany>>;
  doItems: Awaited<ReturnType<typeof prisma.doItem.findMany>>;
  calendar: Awaited<ReturnType<typeof prisma.calendarEvent.findMany>>;
  graph: {
    connections: Awaited<ReturnType<typeof prisma.connection.findMany>>;
    layouts: Awaited<ReturnType<typeof prisma.graphLayout.findMany>>;
    labels: Map<string, string>;
  } | null;
  uploads: Awaited<ReturnType<typeof prisma.fileUpload.findMany>>;
  aiChats: Awaited<
    ReturnType<
      typeof prisma.aiThread.findMany<{ include: { messages: true } }>
    >
  >;
};

function sanitizeFilename(name: string, fallback: string) {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

function uniqueName(base: string, used: Set<string>) {
  let name = base;
  let i = 2;
  while (used.has(name)) {
    name = `${base} (${i})`;
    i++;
  }
  used.add(name);
  return name;
}

function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function buildGraphLabels(userId: string) {
  const [documents, goals, doItems, events, uploads] = await Promise.all([
    prisma.document.findMany({ where: { userId }, select: { id: true, title: true } }),
    prisma.goal.findMany({ where: { userId }, select: { id: true, title: true } }),
    prisma.doItem.findMany({ where: { userId }, select: { id: true, title: true } }),
    prisma.calendarEvent.findMany({ where: { userId }, select: { id: true, title: true } }),
    prisma.fileUpload.findMany({ where: { userId }, select: { id: true, filename: true } }),
  ]);

  const labels = new Map<string, string>();
  for (const d of documents) labels.set(`DOCUMENT:${d.id}`, d.title);
  for (const g of goals) labels.set(`GOAL:${g.id}`, g.title);
  for (const d of doItems) labels.set(`DO_ITEM:${d.id}`, d.title);
  for (const e of events) labels.set(`CALENDAR_EVENT:${e.id}`, e.title);
  for (const f of uploads) labels.set(`FILE:${f.id}`, f.filename);
  return labels;
}

async function loadExportContent(
  userId: string,
  sections: ExportSection[]
): Promise<ExportContent> {
  const include = new Set(sections);
  const exportedAt = new Date();

  const content: ExportContent = {
    exportedAt,
    profile: null,
    notes: [],
    goals: [],
    kpis: [],
    doItems: [],
    calendar: [],
    graph: null,
    uploads: [],
    aiChats: [],
  };

  const tasks: Promise<void>[] = [];

  if (include.has("profile")) {
    tasks.push(
      prisma.user
        .findUniqueOrThrow({
          where: { id: userId },
          select: {
            email: true,
            name: true,
            aiInstructions: true,
            overviewLayout: true,
            sidebarLayout: true,
            onboardingCompletedAt: true,
            createdAt: true,
          },
        })
        .then((user) => {
          content.profile = user;
        })
    );
  }

  if (include.has("notes")) {
    tasks.push(
      prisma.document
        .findMany({
          where: { userId, type: "NOTE" },
          orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
        })
        .then((notes) => {
          content.notes = notes;
        })
    );
  }

  if (include.has("goals")) {
    tasks.push(
      prisma.goal
        .findMany({
          where: { userId },
          orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
        })
        .then((goals) => {
          content.goals = goals;
        })
    );
  }

  if (include.has("kpis")) {
    tasks.push(
      prisma.kpi
        .findMany({
          where: { userId },
          orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
        })
        .then((kpis) => {
          content.kpis = kpis;
        })
    );
  }

  if (include.has("do-list")) {
    tasks.push(
      prisma.doItem
        .findMany({
          where: { userId },
          orderBy: [{ done: "asc" }, { completedAt: "desc" }, { position: "asc" }],
        })
        .then((doItems) => {
          content.doItems = doItems;
        })
    );
  }

  if (include.has("calendar")) {
    tasks.push(
      prisma.calendarEvent
        .findMany({
          where: { userId },
          orderBy: { startAt: "asc" },
        })
        .then((events) => {
          content.calendar = events;
        })
    );
  }

  if (include.has("graph")) {
    tasks.push(
      Promise.all([
        prisma.connection.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.graphLayout.findMany({ where: { userId } }),
        buildGraphLabels(userId),
      ]).then(([connections, layouts, labels]) => {
        content.graph = { connections, layouts, labels };
      })
    );
  }

  if (include.has("uploads")) {
    tasks.push(
      prisma.fileUpload
        .findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        })
        .then((uploads) => {
          content.uploads = uploads;
        })
    );
  }

  if (include.has("ai-chats")) {
    tasks.push(
      prisma.aiThread
        .findMany({
          where: { userId },
          include: { messages: { orderBy: { createdAt: "asc" } } },
          orderBy: { updatedAt: "desc" },
        })
        .then((threads) => {
          content.aiChats = threads;
        })
    );
  }

  await Promise.all(tasks);
  return content;
}

export async function getExportPreview(userId: string): Promise<ExportPreview> {
  const [
    notes,
    goals,
    kpis,
    doItems,
    calendar,
    connections,
    uploads,
    aiThreads,
  ] = await Promise.all([
    prisma.document.count({ where: { userId, type: "NOTE" } }),
    prisma.goal.count({ where: { userId } }),
    prisma.kpi.count({ where: { userId } }),
    prisma.doItem.count({ where: { userId } }),
    prisma.calendarEvent.count({ where: { userId } }),
    prisma.connection.count({ where: { userId } }),
    prisma.fileUpload.count({ where: { userId } }),
    prisma.aiThread.count({ where: { userId } }),
  ]);

  return {
    sections: {
      profile: 1,
      notes,
      goals,
      kpis,
      "do-list": doItems,
      calendar,
      graph: connections,
      uploads,
      "ai-chats": aiThreads,
    },
  };
}

async function buildZipBuffer(content: ExportContent, sections: ExportSection[]) {
  const include = new Set(sections);
  const { exportedAt } = content;

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(stream);

  archive.append(
    [
      "Dasein data export",
      "",
      `Exported: ${exportedAt.toISOString()}`,
      "",
      "This ZIP contains your personal data from Dasein.",
      "- JSON files hold complete structured data.",
      "- Markdown files are human-readable copies of notes and AI chats.",
      "- uploads/ contains your uploaded document files.",
      "",
      "Sections included in this export:",
      ...sections.map((s) => `  - ${s}`),
    ].join("\n"),
    { name: "README.txt" }
  );

  const manifest: Record<string, unknown> = {
    exportedAt: exportedAt.toISOString(),
    sections,
    counts: {},
  };

  if (include.has("profile") && content.profile) {
    (manifest.counts as Record<string, number>).profile = 1;
    archive.append(JSON.stringify(content.profile, null, 2), { name: "profile.json" });
  }

  if (include.has("notes")) {
    (manifest.counts as Record<string, number>).notes = content.notes.length;
    archive.append(JSON.stringify(content.notes, null, 2), { name: "notes.json" });
    const usedNames = new Set<string>();
    for (const note of content.notes) {
      const base = sanitizeFilename(note.title, note.id);
      const filename = uniqueName(base, usedNames);
      const body = [
        `# ${note.title}`,
        "",
        `Updated: ${note.updatedAt.toISOString()}`,
        "",
        note.content || "(empty)",
      ].join("\n");
      archive.append(body, { name: `notes/${filename}.md` });
    }
  }

  if (include.has("goals")) {
    (manifest.counts as Record<string, number>).goals = content.goals.length;
    archive.append(JSON.stringify(content.goals, null, 2), { name: "goals.json" });
  }

  if (include.has("kpis")) {
    (manifest.counts as Record<string, number>).kpis = content.kpis.length;
    archive.append(JSON.stringify(content.kpis, null, 2), { name: "kpis.json" });
  }

  if (include.has("do-list")) {
    (manifest.counts as Record<string, number>)["do-list"] = content.doItems.length;
    archive.append(JSON.stringify(content.doItems, null, 2), { name: "do-list.json" });
  }

  if (include.has("calendar")) {
    (manifest.counts as Record<string, number>).calendar = content.calendar.length;
    archive.append(JSON.stringify(content.calendar, null, 2), { name: "calendar.json" });
  }

  if (include.has("graph") && content.graph) {
    (manifest.counts as Record<string, number>).graph = content.graph.connections.length;
    archive.append(
      JSON.stringify(
        { connections: content.graph.connections, layouts: content.graph.layouts },
        null,
        2
      ),
      { name: "graph.json" }
    );
  }

  if (include.has("uploads")) {
    (manifest.counts as Record<string, number>).uploads = content.uploads.length;
    archive.append(JSON.stringify(content.uploads, null, 2), { name: "uploads.json" });
    const usedNames = new Set<string>();
    for (const file of content.uploads) {
      try {
        const buffer = await readStoredFile(file.storagePath);
        const base = sanitizeFilename(file.filename, file.id);
        const filename = uniqueName(base, usedNames);
        archive.append(buffer, { name: `uploads/${filename}` });
      } catch {
        // skip missing files on disk
      }
    }
  }

  if (include.has("ai-chats")) {
    (manifest.counts as Record<string, number>)["ai-chats"] = content.aiChats.length;
    archive.append(JSON.stringify(content.aiChats, null, 2), { name: "ai-chats.json" });
    const usedNames = new Set<string>();
    for (const thread of content.aiChats) {
      const base = sanitizeFilename(thread.title, thread.id);
      const filename = uniqueName(base, usedNames);
      const lines = [
        `# ${thread.title}`,
        "",
        `Updated: ${thread.updatedAt.toISOString()}`,
        "",
      ];
      for (const msg of thread.messages) {
        const role = msg.role === "USER" ? "You" : "AI";
        lines.push(`## ${role}`, "", msg.content, "");
      }
      archive.append(lines.join("\n"), { name: `ai-chats/${filename}.md` });
    }
  }

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  await archive.finalize();
  return done;
}

function pdfHeading(doc: PDFKit.PDFDocument, text: string, size = 16) {
  doc.moveDown(0.5);
  doc.fontSize(size).font("Helvetica-Bold").text(text);
  doc.moveDown(0.35);
  doc.fontSize(10).font("Helvetica");
}

function pdfBody(doc: PDFKit.PDFDocument, text: string) {
  doc.text(text || "(empty)", { lineGap: 3 });
  doc.moveDown(0.5);
}

function pdfSubheading(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(12).font("Helvetica-Bold").text(text);
  doc.moveDown(0.2);
  doc.fontSize(10).font("Helvetica");
}

function renderPdfSections(
  doc: PDFKit.PDFDocument,
  content: ExportContent,
  sections: ExportSection[]
) {
  const include = new Set(sections);

  if (include.has("profile") && content.profile) {
    doc.addPage();
    pdfHeading(doc, SECTION_LABELS.profile);
    pdfBody(
      doc,
      [
        `Name: ${content.profile.name ?? "(not set)"}`,
        `Email: ${content.profile.email}`,
        `Member since: ${formatDate(content.profile.createdAt)}`,
        "",
        "AI instructions:",
        content.profile.aiInstructions,
      ].join("\n")
    );
  }

  if (include.has("notes") && content.notes.length > 0) {
    doc.addPage();
    pdfHeading(doc, SECTION_LABELS.notes);
    for (const note of content.notes) {
      pdfSubheading(doc, note.title);
      pdfBody(doc, `Updated: ${formatDate(note.updatedAt)}\n\n${note.content}`);
    }
  }

  if (include.has("goals") && content.goals.length > 0) {
    doc.addPage();
    pdfHeading(doc, SECTION_LABELS.goals);
    for (const goal of content.goals) {
      pdfSubheading(doc, goal.title);
      pdfBody(
        doc,
        [
          `Status: ${goal.status}`,
          goal.targetDate ? `Target: ${formatDate(goal.targetDate)}` : null,
          goal.description || null,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }
  }

  if (include.has("kpis") && content.kpis.length > 0) {
    doc.addPage();
    pdfHeading(doc, SECTION_LABELS.kpis);
    for (const kpi of content.kpis) {
      pdfSubheading(doc, kpi.title);
      pdfBody(
        doc,
        [
          `Progress: ${kpi.currentValue}${kpi.unit ? ` ${kpi.unit}` : ""} / ${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}`,
          kpi.description || null,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }
  }

  if (include.has("do-list") && content.doItems.length > 0) {
    doc.addPage();
    pdfHeading(doc, SECTION_LABELS["do-list"]);
    const open = content.doItems.filter((i) => !i.done);
    const done = content.doItems.filter((i) => i.done);
    if (open.length > 0) {
      pdfSubheading(doc, "Open");
      pdfBody(doc, open.map((i) => `• ${i.title}`).join("\n"));
    }
    if (done.length > 0) {
      pdfSubheading(doc, "Done");
      pdfBody(
        doc,
        done
          .map((i) => {
            const when = i.completedAt ? formatDate(i.completedAt) : "—";
            return `• ${i.title} (completed ${when})`;
          })
          .join("\n")
      );
    }
  }

  if (include.has("calendar") && content.calendar.length > 0) {
    doc.addPage();
    pdfHeading(doc, SECTION_LABELS.calendar);
    pdfBody(
      doc,
      content.calendar
        .map((e) => {
          const when = e.allDay
            ? formatDate(e.startAt).split(",")[0]
            : formatDate(e.startAt);
          return `• ${when} — ${e.title}${e.description ? `\n  ${e.description}` : ""}`;
        })
        .join("\n\n")
    );
  }

  if (include.has("graph") && content.graph && content.graph.connections.length > 0) {
    doc.addPage();
    pdfHeading(doc, SECTION_LABELS.graph);
    const { connections, labels } = content.graph;
    pdfBody(
      doc,
      connections
        .map((c) => {
          const src = labels.get(`${c.sourceType}:${c.sourceId}`) ?? c.sourceId;
          const tgt = labels.get(`${c.targetType}:${c.targetId}`) ?? c.targetId;
          const label = c.label ? ` (${c.label})` : "";
          return `• ${src} → ${tgt}${label}`;
        })
        .join("\n")
    );
  }

  if (include.has("uploads") && content.uploads.length > 0) {
    doc.addPage();
    pdfHeading(doc, SECTION_LABELS.uploads);
    for (const file of content.uploads) {
      pdfSubheading(doc, file.filename);
      const text = file.extractedText?.trim();
      pdfBody(
        doc,
        [
          `Type: ${file.mimeType}`,
          `Size: ${Math.round(file.size / 1024)} KB`,
          "",
          text || "(no extractable text — original file available in ZIP export)",
        ].join("\n")
      );
    }
  }

  if (include.has("ai-chats") && content.aiChats.length > 0) {
    for (const thread of content.aiChats) {
      doc.addPage();
      pdfHeading(doc, `${SECTION_LABELS["ai-chats"]}: ${thread.title}`);
      for (const msg of thread.messages) {
        const role = msg.role === "USER" ? "You" : "AI";
        pdfSubheading(doc, role);
        pdfBody(doc, msg.content);
      }
    }
  }
}

async function buildPdfBuffer(content: ExportContent, sections: ExportSection[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).font("Helvetica-Bold").text("Dasein Export", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica").text(`Exported ${formatDate(content.exportedAt)}`, {
      align: "center",
    });
    doc.moveDown(1);
    doc.fontSize(10).text("Sections included:", { underline: true });
    doc.moveDown(0.3);
    for (const section of sections) {
      doc.text(`• ${SECTION_LABELS[section]}`);
    }
    doc.moveDown(0.5);
    doc.fillColor("#666666").text(
      "Readable summary PDF. Use ZIP export for full data, original files, and JSON."
    );
    doc.fillColor("#000000");

    renderPdfSections(doc, content, sections);
    doc.end();
  });
}

export async function buildExportZip(userId: string, sections: ExportSection[]) {
  const content = await loadExportContent(userId, sections);
  const buffer = await buildZipBuffer(content, sections);
  const dateStamp = content.exportedAt.toISOString().slice(0, 10);
  const filename = `dasein-export-${dateStamp}.zip`;
  return { buffer, filename };
}

export async function buildExportPdf(userId: string, sections: ExportSection[]) {
  const content = await loadExportContent(userId, sections);
  const buffer = await buildPdfBuffer(content, sections);
  const dateStamp = content.exportedAt.toISOString().slice(0, 10);
  const filename = `dasein-export-${dateStamp}.pdf`;
  return { buffer, filename };
}
