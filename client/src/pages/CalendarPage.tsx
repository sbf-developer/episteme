import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { api, type CalendarEvent } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function formatMonth(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function eventDayKey(iso: string) {
  return toDateInput(new Date(iso));
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(toDatetimeLocal(new Date()));
  const [allDay, setAllDay] = useState(false);

  const load = () => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    api.calendar
      .list({ from: from.toISOString(), to: to.toISOString() })
      .then(setEvents);
  };

  useEffect(() => {
    load();
  }, [month]);

  const days = useMemo(() => {
    const first = startOfMonth(month);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(month.getFullYear(), month.getMonth(), d),
        key: `d-${d}`,
      });
    }
    return cells;
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = eventDayKey(e.startAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = selected
    ? events.filter((e) => eventDayKey(e.startAt) === selected)
    : [];

  const create = async () => {
    if (!title.trim()) return;
    await api.calendar.create({
      title: title.trim(),
      description,
      startAt: new Date(startAt).toISOString(),
      allDay,
    });
    setTitle("");
    setDescription("");
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await api.calendar.delete(id);
    load();
  };

  const openFormForDay = (date: Date) => {
    setSelected(toDateInput(date));
    setStartAt(toDatetimeLocal(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0)));
    setShowForm(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Calendar</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Schedule events and see what's coming up.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          New event
        </Button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              rows={2}
            />
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              All day
            </label>
            <div className="flex gap-2">
              <Button variant="primary" onClick={create}>Save</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setMonth(addMonths(month, -1))}
            className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)]"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-sm font-semibold">{formatMonth(month)}</h3>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-[var(--color-text-tertiary)]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px">
          {days.map(({ date, key }) => {
            if (!date) return <div key={key} className="min-h-[72px]" />;
            const dayKey = toDateInput(date);
            const dayEvents = eventsByDay.get(dayKey) ?? [];
            const isToday = toDateInput(new Date()) === dayKey;
            const isSelected = selected === dayKey;

            return (
              <button
                key={key}
                onClick={() => setSelected(dayKey)}
                onDoubleClick={() => openFormForDay(date)}
                className={`min-h-[72px] rounded-[var(--radius-sm)] border p-1.5 text-left transition-colors ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                    : "border-transparent hover:bg-[var(--color-border-subtle)]"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-[var(--color-accent)] font-medium text-white" : "text-[var(--color-text)]"
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-[var(--color-text-tertiary)]">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">
            {new Date(selected + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">No events this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{e.title}</p>
                    {e.description && (
                      <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{e.description}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                      {e.allDay
                        ? "All day"
                        : new Date(e.startAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(e.id)}
                    className="text-xs text-[var(--color-text-tertiary)] hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {events.length === 0 && !showForm && (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12 text-center">
          <CalendarIcon size={32} className="mx-auto text-[var(--color-text-tertiary)]" />
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No events yet</p>
        </div>
      )}
    </div>
  );
}
