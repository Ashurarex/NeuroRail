import AppShell from "@/components/layout/app-shell";

const LOG_ENTRIES = [
  { time: "10:12", text: "AI detection: unattended bag at Concourse", level: "high" },
  { time: "10:09", text: "Staff action: alert A-981 verified", level: "info" },
  { time: "10:05", text: "System warning: camera CAM-14 packet delay", level: "medium" },
  { time: "09:58", text: "AI detection: object on track near Platform 3", level: "high" },
  { time: "09:45", text: "Routine check: all cameras operational", level: "info" },
];

const LEVEL_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  info: "bg-accent",
};

export default function AdminLogsPage() {
  return (
    <AppShell
      role="admin"
      title="Activity Logs"
      subtitle="Track event logs, detections, staff actions, and system errors."
    >
      <article className="rail-panel p-5 animate-slide-up">
        <h2 className="text-lg font-bold tracking-tight mb-4">Event Timeline</h2>
        <ul className="space-y-1">
          {LOG_ENTRIES.map((entry, i) => (
            <li
              key={`${entry.time}-${i}`}
              className={`flex items-start gap-3 rounded-xl border border-line/60 bg-surface px-4 py-3 text-sm transition hover:bg-accent/[0.03] animate-slide-up delay-${Math.min(i, 5)}`}
            >
              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${LEVEL_DOT[entry.level] ?? "bg-slate-400"}`} />
              <span className="font-mono text-xs text-muted w-12 shrink-0 pt-0.5">{entry.time}</span>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
      </article>
    </AppShell>
  );
}
