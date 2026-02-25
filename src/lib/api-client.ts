import { FullClient, ClientProfile, IssueRecord, DocRecord, CreditMonitoringRecord, DisputeRecord } from "@/types/models";
import { User } from "@/types/models";

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

export const updateIssue = async (issue: IssueRecord) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateIssue", ...issue }),
  });
  if (!res.ok) throw new Error("Could not update issue");
  return res.json();
};

export const deleteIssue = async (issueId: string) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteIssue", issueId }),
  });
  if (!res.ok) throw new Error("Could not delete issue");
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

export const updateDoc = async (doc: DocRecord) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateDoc", ...doc }),
  });
  if (!res.ok) throw new Error("Could not update doc");
  return res.json();
};

export const deleteDoc = async (docId: string) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteDoc", docId }),
  });
  if (!res.ok) throw new Error("Could not delete doc");
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

export const updateCmIssue = async (cm: CreditMonitoringRecord) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateCmIssue", ...cm }),
  });
  if (!res.ok) throw new Error("Could not update credit monitoring issue");
  return res.json();
};

export const deleteCmIssue = async (cmId: string) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteCmIssue", cmId }),
  });
  if (!res.ok) throw new Error("Could not delete credit monitoring issue");
  return res.json();
};

export const addDispute = async (dispute: Partial<DisputeRecord> & { clientId: string }) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addDispute", ...dispute }),
  });
  if (!res.ok) throw new Error("Could not add dispute");
  return res.json();
};

export const updateDispute = async (dispute: DisputeRecord) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateDispute", ...dispute }),
  });
  if (!res.ok) throw new Error("Could not update dispute");
  return res.json();
};

export const deleteDispute = async (disputeId: string) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "deleteDispute", disputeId }),
  });
  if (!res.ok) throw new Error("Could not delete dispute");
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

export const updateClient = async (client: Partial<ClientProfile> & { id: string }) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateClient", ...client }),
  });
  if (!res.ok) throw new Error("Could not update client");
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

export const fetchUsers = async (): Promise<User[]> => {
  const res = await fetch("/api/users", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch users");
  const payload = await res.json();
  return payload.data as User[];
};

export const addUser = async (user: Partial<User> & { name: string }) => {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error("Could not add user");
  return res.json();
};

export const updateUser = async (user: User) => {
  const res = await fetch("/api/users", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error("Could not update user");
  return res.json();
};

export const deleteUser = async (id: string) => {
  const res = await fetch("/api/users", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Could not delete user");
  return res.json();
};
