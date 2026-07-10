import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Copy, Trash2, ArrowLeft } from "lucide-react";
import { api, type Document } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.documents.get(id).then((d) => {
      setDoc(d);
      setTitle(d.title);
      setContent(d.content);
    });
  }, [id]);

  const save = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.documents.update(id, { title, content });
      setDoc(updated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [id, title, content]);

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(save, 1500);
    return () => clearTimeout(timer);
  }, [dirty, save]);

  const saveAs = async () => {
    if (!id) return;
    const newTitle = prompt("Save as:", `${title} (copy)`);
    if (!newTitle) return;
    const copy = await api.documents.duplicate(id, newTitle);
    navigate(`/notes/${copy.id}`);
  };

  const remove = async () => {
    if (!id || !confirm("Delete this note?")) return;
    await api.documents.delete(id);
    navigate("/notes");
  };

  if (!doc) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => navigate("/notes")}
          className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1" />
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {saving ? "Saving…" : dirty ? "Unsaved" : "Saved"}
        </span>
        <Button variant="ghost" onClick={save} disabled={saving}>
          <Save size={15} />
          Save
        </Button>
        <Button variant="ghost" onClick={saveAs}>
          <Copy size={15} />
          Save as
        </Button>
        <Button variant="ghost" onClick={remove}>
          <Trash2 size={15} />
        </Button>
      </div>

      <Input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        className="mb-4 border-none bg-transparent px-0 text-2xl font-semibold shadow-none focus:ring-0"
        placeholder="Untitled"
      />

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
        placeholder="Start writing…"
        className="min-h-[60vh] flex-1 resize-none border-none bg-transparent text-sm leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)]"
      />
    </div>
  );
}
