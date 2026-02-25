import { SheetSource } from "@/types/client";

interface ConnectionBadgeProps {
  connected: boolean | null;
  source: SheetSource;
  lastSyncedAt?: string;
  reason?: string;
}

export function ConnectionBadge({ connected, source, lastSyncedAt, reason }: ConnectionBadgeProps) {
  const base = connected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200";
  const label = connected ? "Google Sheet live" : source === "sample" ? "Using sample data" : "Offline";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${base}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
      <span className="font-semibold capitalize">{label}</span>
      {lastSyncedAt && (
        <span className="text-xs text-slate-500">Synced {new Date(lastSyncedAt).toLocaleString()}</span>
      )}
      {!connected && reason && <span className="text-xs text-rose-400">{reason}</span>}
    </div>
  );
}
