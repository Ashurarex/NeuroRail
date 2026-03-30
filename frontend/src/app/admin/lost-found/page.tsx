import AppShell from "@/components/layout/app-shell";

const statusFlow = ["Pending", "Matched", "Verified", "Closed"];

export default function AdminLostFoundPage() {
  return (
    <AppShell
      role="admin"
      title="Lost & Found Verification"
      subtitle="Validate AI matches and progress each case through closure."
    >
      <article className="rail-panel p-5">
        <h2 className="text-lg font-semibold">Pending Uploads</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {["Case LF-122", "Case LF-128", "Case LF-131"].map((item) => (
            <div key={item} className="rounded-xl border border-line bg-surface p-3">
              <p className="font-semibold">{item}</p>
              <p className="mt-1 text-xs text-muted">AI suggested: 2 possible matches</p>
              <div className="mt-3 flex gap-2">
                <button className="rounded-lg border border-line px-2 py-1 text-xs">Review</button>
                <button className="rounded-lg bg-accent px-2 py-1 text-xs text-white">Verify</button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rail-panel p-5">
        <h2 className="text-lg font-semibold">Status Pipeline</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {statusFlow.map((state) => (
            <span key={state} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
              {state}
            </span>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
