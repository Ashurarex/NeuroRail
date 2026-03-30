import AppShell from "@/components/layout/app-shell";

const cameraGroups = ["Platform", "Concourse", "Entrances", "Staff zones"];

export default function AdminLivePage() {
  return (
    <AppShell
      role="admin"
      title="Live Surveillance"
      subtitle="Monitor cameras and filter active/offline streams."
    >
      <article className="rail-panel p-5">
        <div className="flex flex-wrap gap-2">
          {[
            "Active cameras",
            "Offline cameras",
          ].map((filter) => (
            <button
              key={filter}
              type="button"
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm"
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {cameraGroups.map((group, index) => (
            <div key={group} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{group}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    index % 2 === 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {index % 2 === 0 ? "LIVE" : "OFFLINE"}
                </span>
              </div>
              <div className="mt-3 h-32 rounded-lg bg-slate-200/70" />
            </div>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
