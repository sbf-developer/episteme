import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { api, type Document } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function NotesPage() {
  const [notes, setNotes] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () =>
    api.documents.list().then((d) => {
      setNotes(d);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const doc = await api.documents.create({ title: "Untitled note", type: "NOTE" });
    navigate(`/notes/${doc.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Notes</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Capture thoughts, outlines, and plans.
          </p>
        </div>
        <Button variant="primary" onClick={create}>
          <Plus size={16} />
          New note
        </Button>
      </div>

      <div className="mt-6 space-y-1">
        {notes.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-16 text-center">
            <FileText size={32} className="mx-auto text-[var(--color-text-tertiary)]" />
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No notes yet</p>
            <Button variant="primary" className="mt-4" onClick={create}>
              Create your first note
            </Button>
          </div>
        ) : (
          notes.map((note) => (
            <Link
              key={note.id}
              to={`/notes/${note.id}`}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 transition-colors hover:border-[var(--color-accent)]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{note.title}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-text-tertiary)]">
                  {note.content.slice(0, 80) || "Empty note"}
                </p>
              </div>
              <span className="ml-4 shrink-0 text-xs text-[var(--color-text-tertiary)]">
                {note.type}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
