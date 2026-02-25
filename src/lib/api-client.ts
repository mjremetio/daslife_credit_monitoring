import { ClientRecord, SheetSource } from "@/types/client";

export const fetchClients = async () => {
  const res = await fetch("/api/clients", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch clients");
  const payload = (await res.json()) as {
    data: ClientRecord[];
    source: SheetSource;
    lastSyncedAt?: string;
    error?: string;
  };
  return payload;
};

export const pushClients = async (records: ClientRecord[]) => {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error((await res.json()).message ?? "Failed to save");
  return res.json();
};

export const checkConnection = async () => {
  const res = await fetch("/api/status", { cache: "no-store" });
  if (!res.ok) return { connected: false, reason: "Status endpoint failed" } as const;
  return (await res.json()) as { connected: boolean; reason?: string; response?: unknown };
};
