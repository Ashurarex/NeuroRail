import AppShell from "@/components/layout/app-shell";

export default function AdminLogsPage() {
  return (
    <AppShell
      role="admin"
      title="Activity Logs"
      subtitle="Track event logs, detections, staff actions, and system errors."
    >
      <article className="rail-panel p-5">
        <ul className="space-y-3 text-sm">
          {[
            "10:12 - AI detection: unattended bag at Concourse",
            "10:09 - Staff action: alert A-981 verified",
            "10:05 - System warning: camera CAM-14 packet delay",
          ].map((entry) => (
            <li key={entry} className="rounded-lg border border-line bg-surface px-3 py-2">
              {entry}
            </li>
          ))}
        </ul>
      </article>
    </AppShell>
  );
}
