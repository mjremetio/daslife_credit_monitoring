import { FullClient, ClientProfile, IssueRecord, DocRecord, CreditMonitoringRecord } from "@/types/models";

export const fetchClients = async (): Promise<FullClient[]> => {
  const res = await fetch("/api/clients", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch clients");
  const payload = await res.json();
  return payload.data as FullClient[];
};

export const replaceAll = async (data: {
  clients: ClientProfile[];
  issues: IssueRecord[];
  docs: DocRecord[];
  cmIssues: CreditMonitoringRecord[];
}) => {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save");
  return res.json();
};

export const markProcessed = async (clientId: string) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markProcessed", clientId }),
  });
  if (!res.ok) throw new Error("Could not mark processed");
  return res.json();
};

export const toggleIssueResolved = async (issueId: string, resolved: boolean) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggleIssue", issueId, resolved }),
  });
  if (!res.ok) throw new Error("Could not update issue");
};

export const addIssue = async (issue: Partial<IssueRecord> & { clientId: string }) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addIssue", ...issue }),
  });
  if (!res.ok) throw new Error("Could not add issue");
  return res.json();
};

export const addDoc = async (doc: Partial<DocRecord> & { clientId: string }) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addDoc", ...doc }),
  });
  if (!res.ok) throw new Error("Could not add doc");
  return res.json();
};

export const addCmIssue = async (cm: Partial<CreditMonitoringRecord> & { clientId: string }) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addCmIssue", ...cm }),
  });
  if (!res.ok) throw new Error("Could not add credit monitoring issue");
  return res.json();
};

export const addClient = async (client: Partial<ClientProfile> & { name: string }) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addClient", ...client }),
  });
  if (!res.ok) throw new Error("Could not add client");
  return res.json();
};

export const deleteClient = async (clientId: string) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteClient", clientId }),
  });
  if (!res.ok) throw new Error("Could not delete client");
  return res.json();
};
