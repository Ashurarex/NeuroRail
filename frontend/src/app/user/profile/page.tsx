"use client";

import { useState } from "react";
import AppShell from "@/components/layout/app-shell";

const statuses = ["All alerts", "Critical", "Active", "Resolved"];
const types = [
  "Object on track",
  "Unattended bag",
  "Unauthorized",
  "Crowd alert",
];

export default function UserProfilePage() {
  const [selectedStatus, setSelectedStatus] = useState("All alerts");
  const [selectedType, setSelectedType] = useState("Object on track");

  return (
    <AppShell
      role="user"
      title="Profile"
      subtitle="Review personal alert feed and apply filters."
    >
      <article className="rail-panel p-5">
        <h2 className="text-lg font-semibold">Alert Filters</h2>
        <div className="mt-3 grid gap-3 grid-cols-1 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted">Status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${selectedStatus === status
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface hover:border-accent"
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${selectedType === type
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface hover:border-accent"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>

      <article className="rail-panel p-5">
        <h2 className="text-lg font-semibold">My Alerts</h2>
        <p className="mt-2 text-xs text-muted">
          Filtered by: <span className="font-semibold text-accent">{selectedStatus}</span> •{" "}
          <span className="font-semibold text-accent">{selectedType}</span>
        </p>
        <ul className="mt-3 space-y-3">
          {[
            "Critical: Object on track at Platform 3",
            "Active: Unattended bag at Concourse C",
            "Resolved: Crowd alert near East Entry",
          ].map((item) => (
            <li key={item} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              {item}
            </li>
          ))}
        </ul>
      </article>
    </AppShell>
  );
}
