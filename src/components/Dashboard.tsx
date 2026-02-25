"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { addDays, isWithinInterval, parseISO } from "date-fns";
import {
  CalendarDays,
  Check,
  FileSpreadsheet,
  RefreshCcw,
  Search,
  Send,
  LayoutDashboard,
  ListChecks,
  Shield,
  FileText,
  Users,
  Bug,
  ClipboardList,
} from "lucide-react";
import { ClientsTable } from "./ClientsTable";
import { MetricCard } from "./MetricCard";
import {
  fetchClients,
  markProcessed,
  toggleIssueResolved,
  addIssue,
  addClient,
  updateClient,
  deleteClient,
  addDoc,
  addCmIssue,
  updateIssue,
  deleteIssue,
  updateDoc,
  deleteDoc,
  updateCmIssue,
  deleteCmIssue,
} from "@/lib/api-client";
import { FullClient, DocRecord, CreditMonitoringRecord, ClientProfile, User, IssueRecord } from "@/types/models";
import { exportCsv, exportXls, exportRowsCsv, exportRowsXls } from "@/lib/exporters";
import { Modal } from "./Modal";
import {
  fetchUsers,
  addUser as addUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
} from "@/lib/api-client";

const today = new Date();

const formatDate = (value: string | null) => (value ? new Date(value + "T00:00:00").toLocaleDateString() : "—");

const isOverdue = (c: FullClient) => c.nextDueDate && parseISO(c.nextDueDate) < today;
const dueWithin = (c: FullClient, days: number) =>
  c.nextDueDate && isWithinInterval(parseISO(c.nextDueDate), { start: today, end: addDays(today, days) });

export function Dashboard({ initialClients, initialUsers }: { initialClients: FullClient[]; initialUsers: User[] }) {
  const [clients, setClients] = useState<FullClient[]>(initialClients);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [disputerFilter, setDisputerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "clients" | "ready" | "issues" | "docs" | "cm" | "users">("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FullClient | null>(null);
  const [clientForm, setClientForm] = useState<{ name: string; disputer: string; status: ClientProfile["status"]; round: number }>({
    name: "",
    disputer: "",
    status: "Active",
    round: 1,
  });
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userEditing, setUserEditing] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<{ name: string; email: string; role: string; status: User["status"] }>({
    name: "",
    email: "",
    role: "Disputer",
    status: "Active",
  });
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueRecord | null>(null);
  const [issueForm, setIssueForm] = useState<{ clientId: string; issueType: string; note: string; messageSent: boolean; messageDate: string | null; resolved: boolean }>({
    clientId: initialClients[0]?.id ?? "",
    issueType: "Proof of Address",
    note: "",
    messageSent: false,
    messageDate: null,
    resolved: false,
  });
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocRecord | null>(null);
  const [docForm, setDocForm] = useState<{ clientId: string; docType: string; status: DocRecord["status"]; category: DocRecord["category"]; messageSent: boolean; messageDate: string | null; note: string }>({
    clientId: initialClients[0]?.id ?? "",
    docType: "ID",
    status: "pending",
    category: "completing",
    messageSent: false,
    messageDate: null,
    note: "",
  });
  const [cmModalOpen, setCmModalOpen] = useState(false);
  const [editingCm, setEditingCm] = useState<CreditMonitoringRecord | null>(null);
  const [cmForm, setCmForm] = useState<{ clientId: string; platform: string; issue: string; messageSent: boolean; messageDate: string | null; resolved: boolean }>({
    clientId: initialClients[0]?.id ?? "",
    platform: "Smart Credit",
    issue: "",
    messageSent: false,
    messageDate: null,
    resolved: false,
  });
  const [issueSearch, setIssueSearch] = useState("");
  const [issueFilter, setIssueFilter] = useState<"all" | "open" | "resolved">("all");
  const [issuePage, setIssuePage] = useState(0);
  const [issuePageSize, setIssuePageSize] = useState(10);

  const [cmSearch, setCmSearch] = useState("");
  const [cmResolvedFilter, setCmResolvedFilter] = useState<"all" | "open" | "resolved">("all");
  const [cmPage, setCmPage] = useState(0);
  const [cmPageSize, setCmPageSize] = useState(10);

  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | User["status"]>("all");
  const [userPage, setUserPage] = useState(0);
  const [userPageSize, setUserPageSize] = useState(10);

  const [readySearch, setReadySearch] = useState("");
  const [readyPage, setReadyPage] = useState(0);
  const [readyPageSize, setReadyPageSize] = useState(10);

  const refresh = async () => {
    setBusy(true);
    try {
      const [data, userList] = await Promise.all([fetchClients(), fetchUsers()]);
      setClients(data);
      setUsers(userList);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (clients.length > 0) {
      if (!issueForm.clientId) setIssueForm((prev) => ({ ...prev, clientId: clients[0].id }));
      if (!docForm.clientId) setDocForm((prev) => ({ ...prev, clientId: clients[0].id }));
      if (!cmForm.clientId) setCmForm((prev) => ({ ...prev, clientId: clients[0].id }));
    }
  }, [clients, issueForm.clientId, docForm.clientId, cmForm.clientId]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(term) || c.disputer.toLowerCase().includes(term) || c.notes.toLowerCase().includes(term);
      const matchesDisputer = disputerFilter === "all" || c.disputer === disputerFilter;
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesDisputer && matchesStatus;
    });
  }, [clients, search, disputerFilter, statusFilter]);

  const counters = useMemo(() => {
    const ready = clients.filter((c) => c.status === "Active" && !c.issues.some((i) => !i.resolved) && isOverdue(c)).length;
    const withIssues = clients.filter((c) => c.issues.some((i) => !i.resolved)).length;
    const docsPending = clients.filter((c) => c.docs.some((d) => d.status === "pending" || d.status === "sent")).length;
    const cmIssues = clients.filter((c) => c.cmIssues.some((cm) => !cm.resolved)).length;
    return { ready, withIssues, docsPending, cmIssues };
  }, [clients]);

  const dueStrip = useMemo(
    () =>
      clients
        .filter((c) => c.nextDueDate && dueWithin(c, 7))
        .sort((a, b) => (a.nextDueDate || "").localeCompare(b.nextDueDate || ""))
        .slice(0, 6),
    [clients],
  );

  const readyQueue = useMemo(
    () =>
      clients
        .filter((c) => c.status === "Active")
        .sort((a, b) => (a.nextDueDate || "9999-99-99").localeCompare(b.nextDueDate || "9999-99-99")),
    [clients],
  );

  const issues = useMemo(
    () => clients.flatMap((c) => c.issues.map((i) => ({ client: c, issue: i }))),
    [clients],
  );

  const docs = useMemo(
    () => clients.flatMap((c) => c.docs.map((d) => ({ client: c, doc: d }))),
    [clients],
  );

  const cmIssues = useMemo(
    () => clients.flatMap((c) => c.cmIssues.map((cm) => ({ client: c, cm }))),
    [clients],
  );

  const filteredIssues = useMemo(() => {
    const searchTerm = issueSearch.toLowerCase();
    return issues
      .filter(({ client, issue }) => {
        const matchesSearch =
          client.name.toLowerCase().includes(searchTerm) ||
          (issue.issueType || "").toLowerCase().includes(searchTerm) ||
          (issue.note || "").toLowerCase().includes(searchTerm);
        const matchesResolved =
          issueFilter === "all" ? true : issueFilter === "resolved" ? issue.resolved : !issue.resolved;
        return matchesSearch && matchesResolved;
      })
      .sort((a, b) => (a.client.name || "").localeCompare(b.client.name || ""));
  }, [issues, issueSearch, issueFilter]);

  const filteredCm = useMemo(() => {
    const term = cmSearch.toLowerCase();
    return cmIssues
      .filter(({ client, cm }) => {
        const matchesSearch =
          client.name.toLowerCase().includes(term) ||
          (cm.platform || "").toLowerCase().includes(term) ||
          (cm.issue || "").toLowerCase().includes(term);
        const matchesResolved = cmResolvedFilter === "all" ? true : cmResolvedFilter === "resolved" ? cm.resolved : !cm.resolved;
        return matchesSearch && matchesResolved;
      })
      .sort((a, b) => (a.client.name || "").localeCompare(b.client.name || ""));
  }, [cmIssues, cmSearch, cmResolvedFilter]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase();
    return users
      .filter((u) => {
        const matchesSearch = u.name.toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term);
        const matchesStatus = userStatusFilter === "all" ? true : u.status === userStatusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, userSearch, userStatusFilter]);

  const filteredReady = useMemo(() => {
    const term = readySearch.toLowerCase();
    return readyQueue.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.disputer || "").toLowerCase().includes(term),
    );
  }, [readyQueue, readySearch]);

  const paginate = <T,>(rows: T[], page: number, size: number) => {
    const start = page * size;
    return rows.slice(start, start + size);
  };

  const disputers = useMemo(() => {
    const byUsers = users.map((u) => u.name).filter(Boolean);
    const byClients = clients.map((c) => c.disputer).filter(Boolean);
    return Array.from(new Set([...byUsers, ...byClients]));
  }, [users, clients]);

  const handleProcessed = async (id: string) => {
    setBusy(true);
    await markProcessed(id);
    await refresh();
    setBusy(false);
  };

  const handleResolveIssue = async (id: string, resolved: boolean) => {
    setBusy(true);
    await toggleIssueResolved(id, resolved);
    await refresh();
    setBusy(false);
  };

  const handleSaveIssue = async () => {
    if (!issueForm.clientId) return;
    setBusy(true);
    const payload: IssueRecord = {
      id: editingIssue?.id || "",
      clientId: issueForm.clientId,
      issueType: issueForm.issueType,
      messageSent: issueForm.messageSent,
      messageDate: issueForm.messageSent ? issueForm.messageDate || new Date().toISOString().slice(0, 10) : null,
      resolved: issueForm.resolved,
      note: issueForm.note,
    };
    if (editingIssue) {
      await updateIssue(payload);
    } else {
      await addIssue({ ...payload, id: undefined });
    }
    setIssueForm((prev) => ({ ...prev, note: "", issueType: "Proof of Address", resolved: false, messageSent: false, messageDate: null }));
    setEditingIssue(null);
    setIssueModalOpen(false);
    await refresh();
    setBusy(false);
  };

  const handleDeleteIssue = async (issueId: string) => {
    setBusy(true);
    await deleteIssue(issueId);
    await refresh();
    setBusy(false);
  };

  const handleSaveClient = async () => {
    if (!clientForm.name.trim()) return;
    setBusy(true);
    if (editing) {
      await updateClient({
        ...editing,
        ...clientForm,
        dateProcessed: editing.dateProcessed || new Date().toISOString().slice(0, 10),
      });
    } else {
      await addClient({
        name: clientForm.name.trim(),
        disputer: clientForm.disputer,
        status: clientForm.status,
        round: clientForm.round,
        dateProcessed: new Date().toISOString().slice(0, 10),
      });
    }
    setClientForm({ name: "", disputer: "", status: "Active", round: 1 });
    setEditing(null);
    setModalOpen(false);
    await refresh();
    setBusy(false);
  };

  const handleDeleteClient = async (id: string) => {
    setBusy(true);
    await deleteClient(id);
    await refresh();
    setBusy(false);
  };

  const handleSaveDoc = async () => {
    if (!docForm.clientId || !docForm.docType.trim()) return;
    setBusy(true);
    const payload: DocRecord = {
      id: editingDoc?.id || "",
      clientId: docForm.clientId,
      docType: docForm.docType,
      status: docForm.status,
      messageSent: docForm.messageSent,
      messageDate: docForm.messageSent ? docForm.messageDate || new Date().toISOString().slice(0, 10) : null,
      note: docForm.note,
      category: docForm.category,
    };
    if (editingDoc) {
      await updateDoc(payload);
    } else {
      await addDoc({ ...payload, id: undefined });
    }
    setDocForm((prev) => ({ ...prev, note: "", docType: "ID", status: "pending", messageSent: false, messageDate: null }));
    setEditingDoc(null);
    setDocModalOpen(false);
    await refresh();
    setBusy(false);
  };

  const handleDeleteDoc = async (docId: string) => {
    setBusy(true);
    await deleteDoc(docId);
    await refresh();
    setBusy(false);
  };

  const handleSaveCm = async () => {
    if (!cmForm.clientId || !cmForm.platform.trim()) return;
    setBusy(true);
    const payload: CreditMonitoringRecord = {
      id: editingCm?.id || "",
      clientId: cmForm.clientId,
      platform: cmForm.platform,
      issue: cmForm.issue,
      messageSent: cmForm.messageSent,
      messageDate: cmForm.messageSent ? cmForm.messageDate || new Date().toISOString().slice(0, 10) : null,
      resolved: cmForm.resolved,
    };
    if (editingCm) {
      await updateCmIssue(payload);
    } else {
      await addCmIssue({ ...payload, id: undefined });
    }
    setEditingCm(null);
    setCmModalOpen(false);
    setCmForm((prev) => ({ ...prev, issue: "", messageSent: false, messageDate: null, resolved: false }));
    await refresh();
    setBusy(false);
  };

  const handleDeleteCm = async (cmId: string) => {
    setBusy(true);
    await deleteCmIssue(cmId);
    await refresh();
    setBusy(false);
  };

  const handleToggleCmResolved = async (cmId: string, resolved: boolean) => {
    setBusy(true);
    const found = cmIssues.find(({ cm }) => cm.id === cmId)?.cm;
    if (found) {
      await updateCmIssue({ ...found, resolved });
    }
    await refresh();
    setBusy(false);
  };

  const handleSaveUser = async () => {
    if (!userForm.name.trim()) return;
    setBusy(true);
    if (userEditing) {
      await updateUserApi({ ...userEditing, ...userForm });
    } else {
      await addUserApi({ ...userForm, name: userForm.name.trim() });
    }
    setUserForm({ name: "", email: "", role: "Disputer", status: "Active" });
    setUserEditing(null);
    setUserModalOpen(false);
    await refresh();
    setBusy(false);
  };

  const handleDeleteUser = async (id: string) => {
    setBusy(true);
    await deleteUserApi(id);
    await refresh();
    setBusy(false);
  };

  return (
    <div className="mx-auto flex max-w-6xl gap-5 px-4 pb-16 pt-10">
      <nav className="sticky top-6 hidden h-fit min-w-[210px] flex-col gap-2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:flex">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</p>
        {[
          { id: "overview", label: "Dashboard", icon: LayoutDashboard },
          { id: "clients", label: "Client Management", icon: ClipboardList },
          { id: "ready", label: "Ready to Process", icon: ListChecks },
          { id: "issues", label: "Dues with Issues", icon: Bug },
          { id: "docs", label: "Document Trackers", icon: FileText },
          { id: "cm", label: "Credit Monitoring", icon: Shield },
          { id: "users", label: "Users (Disputers)", icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active ? "bg-slate-900 text-white shadow" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-sky-100/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">Das Life & Credit Solutions</p>
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Credit Status Monitoring</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Unified client profile across rounds, issues, docs, and credit monitoring. Data is stored locally in SQLite.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
              onClick={refresh}
              disabled={busy}
            >
              <RefreshCcw size={16} /> Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:border-slate-300"
              onClick={() => exportCsv(clients)}
            >
              <FileSpreadsheet size={16} /> Export CSV
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:border-slate-300"
              onClick={() => exportXls(clients)}
            >
              <FileSpreadsheet size={16} /> Export XLS
            </button>
          </div>
        </div>
        {message && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{message}</p>}
      </header>

      {/* Overview */}
      {activeTab === "overview" && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Ready to process" value={counters.ready} helper="Overdue & no open issues" accent="blue" />
            <MetricCard label="Clients w/ issues" value={counters.withIssues} helper="Unresolved issues" accent="amber" />
            <MetricCard label="Docs pending" value={counters.docsPending} helper="Pending or sent docs" accent="green" />
            <MetricCard label="CM issues" value={counters.cmIssues} helper="Unresolved credit monitoring" accent="red" />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-md">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner">
                <CalendarDays size={16} className="text-slate-500" />
                <p className="text-sm text-slate-700">Due in next 7 days</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {dueStrip.length === 0 && <span>No clients due in the next 7 days.</span>}
              {dueStrip.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1">
                  {c.name}
                  <span className="text-xs text-slate-500">{formatDate(c.nextDueDate)}</span>
                </span>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Ready Queue */}
      {activeTab === "ready" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Ready to Process Queue</h2>
              <span className="text-sm text-slate-500">Click “Mark Processed” to advance round & due date</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Search ready..."
                value={readySearch}
                onChange={(e) => {
                  setReadySearch(e.target.value);
                  setReadyPage(0);
                }}
              />
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                onClick={() =>
                  exportRowsCsv(
                    filteredReady.map((c) => ({
                      client: c.name,
                      disputer: c.disputer,
                      due: c.nextDueDate,
                      round: c.round,
                      isNew: c.isNew,
                    })),
                    "ready-queue.csv",
                  )
                }
              >
                Export CSV
              </button>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                onClick={() =>
                  exportRowsXls(
                    filteredReady.map((c) => ({
                      client: c.name,
                      disputer: c.disputer,
                      due: c.nextDueDate,
                      round: c.round,
                      isNew: c.isNew,
                    })),
                    "ready-queue.xlsx",
                    "Ready",
                  )
                }
              >
                Export XLS
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">New/Old</th>
                  <th className="px-3 py-2 text-left">Due</th>
                  <th className="px-3 py-2 text-left">Disputer</th>
                  <th className="px-3 py-2 text-left">Round</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginate(filteredReady, readyPage, readyPageSize).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-sm font-semibold text-slate-900">{c.name}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{c.isNew ? "NEW" : "OLD"}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{formatDate(c.nextDueDate)}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{c.disputer || ""}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{c.round}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-600"
                        onClick={() => handleProcessed(c.id)}
                        disabled={busy}
                      >
                        <Check size={14} /> Mark Processed
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReady.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={6}>
                      No clients in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600 mt-3">
            <div>
              Page {readyPage + 1} of {Math.max(1, Math.ceil(filteredReady.length / readyPageSize))}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={readyPageSize}
                onChange={(e) => {
                  setReadyPageSize(Number(e.target.value));
                  setReadyPage(0);
                }}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => setReadyPage((p) => Math.max(0, p - 1))}
                  disabled={readyPage === 0}
                >
                  Prev
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() =>
                    setReadyPage((p) => (p + 1 < Math.ceil(filteredReady.length / readyPageSize) ? p + 1 : p))
                  }
                  disabled={readyPage + 1 >= Math.ceil(filteredReady.length / readyPageSize)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Issues */}
      {activeTab === "issues" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Dues with Issues</h2>
              <p className="text-xs text-slate-500">Edit, resolve, or delete issues per client.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={issueSearch}
                onChange={(e) => {
                  setIssueSearch(e.target.value);
                  setIssuePage(0);
                }}
                placeholder="Search issues..."
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={issueFilter}
                onChange={(e) => {
                  setIssueFilter(e.target.value as typeof issueFilter);
                  setIssuePage(0);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                onClick={() =>
                  exportRowsCsv(
                    filteredIssues.map(({ client, issue }) => ({
                      client: client.name,
                      issue: issue.issueType,
                      note: issue.note,
                      messageSent: issue.messageSent,
                      messageDate: issue.messageDate,
                      resolved: issue.resolved,
                    })),
                    "issues.csv",
                  )
                }
              >
                Export CSV
              </button>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                onClick={() =>
                  exportRowsXls(
                    filteredIssues.map(({ client, issue }) => ({
                      client: client.name,
                      issue: issue.issueType,
                      note: issue.note,
                      messageSent: issue.messageSent,
                      messageDate: issue.messageDate,
                      resolved: issue.resolved,
                    })),
                    "issues.xlsx",
                    "Issues",
                  )
                }
              >
                Export XLS
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
                onClick={() => {
                  setEditingIssue(null);
                  setIssueForm({
                    clientId: clients[0]?.id ?? "",
                    issueType: "Proof of Address",
                    note: "",
                    messageSent: false,
                    messageDate: null,
                    resolved: false,
                  });
                  setIssueModalOpen(true);
                }}
              >
                + Add Issue
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">Issue</th>
                  <th className="px-3 py-2 text-left">Message</th>
                  <th className="px-3 py-2 text-left">Resolved</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginate(filteredIssues, issuePage, issuePageSize).map(({ client, issue }) => (
                  <tr key={issue.id}>
                    <td className="px-3 py-2 font-semibold text-slate-900">{client.name}</td>
                    <td className="px-3 py-2 text-slate-700">{issue.issueType || "(unspecified)"}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {issue.messageSent ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          <Send size={12} /> {issue.messageDate || "sent"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Not sent</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={issue.resolved}
                          onChange={(e) => handleResolveIssue(issue.id, e.target.checked)}
                        />
                        {issue.resolved ? "Resolved" : "Open"}
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                          onClick={() => {
                            setEditingIssue(issue);
                            setIssueForm({
                              clientId: issue.clientId,
                              issueType: issue.issueType,
                              note: issue.note,
                              messageSent: issue.messageSent,
                              messageDate: issue.messageDate,
                              resolved: issue.resolved,
                            });
                            setIssueModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white"
                          onClick={() => handleDeleteIssue(issue.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredIssues.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={5}>
                      No issues logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div>
              Page {issuePage + 1} of {Math.max(1, Math.ceil(filteredIssues.length / issuePageSize))}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={issuePageSize}
                onChange={(e) => {
                  setIssuePageSize(Number(e.target.value));
                  setIssuePage(0);
                }}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => setIssuePage((p) => Math.max(0, p - 1))}
                  disabled={issuePage === 0}
                >
                  Prev
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() =>
                    setIssuePage((p) => (p + 1 < Math.ceil(filteredIssues.length / issuePageSize) ? p + 1 : p))
                  }
                  disabled={issuePage + 1 >= Math.ceil(filteredIssues.length / issuePageSize)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Docs */}
      {activeTab === "docs" && (
        <DocsSection
          docs={docs}
          onAddClick={() => {
            setEditingDoc(null);
            setDocForm({
              clientId: clients[0]?.id ?? "",
              docType: "ID",
              status: "pending",
              category: "completing",
              messageSent: false,
              messageDate: null,
              note: "",
            });
            setDocModalOpen(true);
          }}
          onEdit={(doc) => {
            setEditingDoc(doc);
            setDocForm({
              clientId: doc.clientId,
              docType: doc.docType,
              status: doc.status,
              category: doc.category,
              messageSent: doc.messageSent,
              messageDate: doc.messageDate,
              note: doc.note,
            });
            setDocModalOpen(true);
          }}
          onDelete={handleDeleteDoc}
        />
      )}

      {/* Credit Monitoring */}
      {activeTab === "cm" && (
        <CreditMonitoringSection
          cmIssues={filteredCm}
          onAddClick={() => {
            setEditingCm(null);
            setCmForm({
              clientId: clients[0]?.id ?? "",
              platform: "Smart Credit",
              issue: "",
              messageSent: false,
              messageDate: null,
              resolved: false,
            });
            setCmModalOpen(true);
          }}
          onEditClick={(cm) => {
            setEditingCm(cm);
            setCmForm({
              clientId: cm.clientId,
              platform: cm.platform,
              issue: cm.issue,
              messageSent: cm.messageSent,
              messageDate: cm.messageDate,
              resolved: cm.resolved,
            });
            setCmModalOpen(true);
          }}
          onToggleResolved={handleToggleCmResolved}
          onDelete={handleDeleteCm}
          search={cmSearch}
          setSearch={setCmSearch}
          resolvedFilter={cmResolvedFilter}
          setResolvedFilter={setCmResolvedFilter}
          page={cmPage}
          setPage={setCmPage}
          pageSize={cmPageSize}
          setPageSize={setCmPageSize}
        />
      )}

      {/* Users / Disputers */}
      {activeTab === "users" && (
        <UsersSection
          clients={clients}
          users={filteredUsers}
          onAdd={() => {
            setUserEditing(null);
            setUserForm({ name: "", email: "", role: "Disputer", status: "Active" });
            setUserModalOpen(true);
          }}
          onEdit={(user) => {
            setUserEditing(user);
            setUserForm({ name: user.name, email: user.email, role: user.role, status: user.status });
            setUserModalOpen(true);
          }}
          onDelete={handleDeleteUser}
          search={userSearch}
          setSearch={setUserSearch}
          statusFilter={userStatusFilter}
          setStatusFilter={setUserStatusFilter}
          page={userPage}
          setPage={setUserPage}
          pageSize={userPageSize}
          setPageSize={setUserPageSize}
        />
      )}

      {/* Client Management */}
          {activeTab === "clients" && (
        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-md">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner">
                <Search size={16} className="text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client, disputer, notes..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={disputerFilter}
                  onChange={(e) => setDisputerFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All disputers</option>
                  {disputers.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">Any status</option>
                  {["Active", "On Hold", "Completed", "Dropped"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
                onClick={() => {
                  setEditing(null);
                  setClientForm({ name: "", disputer: "", status: "Active", round: 1 });
                  setModalOpen(true);
                }}
              >
                + Add Client
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Client Master List</h2>
              <span className="text-xs text-slate-500">Search & filter above, sort columns in table.</span>
            </div>
            <ClientsTable
              data={filtered}
              onDelete={handleDeleteClient}
              onEdit={(client) => {
                setEditing(client);
                setClientForm({
                  name: client.name,
                  disputer: client.disputer,
                  status: client.status,
                  round: client.round,
                });
                setModalOpen(true);
              }}
            />
          </div>
        </section>
      )}
      <ClientModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSaveClient}
        form={clientForm}
        setForm={setClientForm}
        disputers={disputers}
        busy={busy}
      />
      <UserModal
        open={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setUserEditing(null);
        }}
        onSave={handleSaveUser}
        form={userForm}
        setForm={setUserForm}
        busy={busy}
      />
      <IssueModal
        open={issueModalOpen}
        onClose={() => {
          setIssueModalOpen(false);
          setEditingIssue(null);
        }}
        onSave={handleSaveIssue}
        form={issueForm}
        setForm={setIssueForm}
        clients={clients}
        busy={busy}
      />
      <DocModal
        open={docModalOpen}
        onClose={() => {
          setDocModalOpen(false);
          setEditingDoc(null);
        }}
        onSave={handleSaveDoc}
        form={docForm}
        setForm={setDocForm}
        clients={clients}
        busy={busy}
      />
      <CmModal
        open={cmModalOpen}
        onClose={() => {
          setCmModalOpen(false);
          setEditingCm(null);
        }}
        onSave={handleSaveCm}
        form={cmForm}
        setForm={setCmForm}
        clients={clients}
        busy={busy}
      />
      </div>
    </div>
  );
}

type DocWithClient = { client: FullClient; doc: DocRecord };
type CmWithClient = { client: FullClient; cm: CreditMonitoringRecord };

function DocsSection({
  docs,
  onAddClick,
  onEdit,
  onDelete,
}: {
  docs: DocWithClient[];
  onAddClick: () => void;
  onEdit: (doc: DocRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [docsSearch, setDocsSearch] = useState("");
  const [docsStatusFilter, setDocsStatusFilter] = useState<"all" | DocRecord["status"]>("all");
  const [docsCategoryFilter, setDocsCategoryFilter] = useState<"all" | DocRecord["category"]>("all");
  const [docsPage, setDocsPage] = useState(0);
  const [docsPageSize, setDocsPageSize] = useState(10);

  const filteredDocs = useMemo(() => {
    const term = docsSearch.toLowerCase();
    return docs.filter(({ client, doc }) => {
      const matchesSearch =
        client.name.toLowerCase().includes(term) ||
        (doc.docType || "").toLowerCase().includes(term) ||
        (doc.note || "").toLowerCase().includes(term);
      const matchesStatus = docsStatusFilter === "all" ? true : doc.status === docsStatusFilter;
      const matchesCategory = docsCategoryFilter === "all" ? true : doc.category === docsCategoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [docs, docsSearch, docsStatusFilter, docsCategoryFilter]);

  const completing = filteredDocs.filter(({ doc }) => doc.category === "completing");
  const updating = filteredDocs.filter(({ doc }) => doc.category === "updating");
  const pageRows = (rows: DocWithClient[]) => rows.slice(docsPage * docsPageSize, docsPage * docsPageSize + docsPageSize);

  const renderTable = (rows: DocWithClient[]) => (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Doc</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Message</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ client, doc }) => (
              <tr key={doc.id}>
                <td className="px-3 py-2 font-semibold text-slate-900">{client.name}</td>
                <td className="px-3 py-2 text-slate-700">{doc.docType}</td>
                <td className="px-3 py-2 text-slate-700 capitalize">{doc.status}</td>
                <td className="px-3 py-2 text-slate-700">{doc.messageSent ? doc.messageDate || "sent" : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => onEdit(doc)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => onDelete(doc.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={5}>
                  No items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Document Trackers</h2>
          <span className="text-xs text-slate-500">Completing vs Updating</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search docs..."
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={docsSearch}
            onChange={(e) => {
              setDocsSearch(e.target.value);
              setDocsPage(0);
            }}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={docsStatusFilter}
            onChange={(e) => {
              setDocsStatusFilter(e.target.value as typeof docsStatusFilter);
              setDocsPage(0);
            }}
          >
            <option value="all">Any status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="complete">Complete</option>
          </select>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={docsCategoryFilter}
            onChange={(e) => {
              setDocsCategoryFilter(e.target.value as typeof docsCategoryFilter);
              setDocsPage(0);
            }}
          >
            <option value="all">Any category</option>
            <option value="completing">Completing</option>
            <option value="updating">Updating</option>
          </select>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onClick={() =>
              exportRowsCsv(
                filteredDocs.map(({ client, doc }) => ({
                  client: client.name,
                  docType: doc.docType,
                  status: doc.status,
                  category: doc.category,
                  messageSent: doc.messageSent,
                  messageDate: doc.messageDate,
                })),
                "docs.csv",
              )
            }
          >
            Export CSV
          </button>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onClick={() =>
              exportRowsXls(
                filteredDocs.map(({ client, doc }) => ({
                  client: client.name,
                  docType: doc.docType,
                  status: doc.status,
                  category: doc.category,
                  messageSent: doc.messageSent,
                  messageDate: doc.messageDate,
                })),
                "docs.xlsx",
                "Docs",
              )
            }
          >
            Export XLS
          </button>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            onClick={onAddClick}
          >
            + Add Doc
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Completing Docs</h3>
          {renderTable(pageRows(completing))}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Updating Docs</h3>
          {renderTable(pageRows(updating))}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600 mt-3">
        <div>
          Page {docsPage + 1} of {Math.max(1, Math.ceil(filteredDocs.length / docsPageSize))}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={docsPageSize}
            onChange={(e) => {
              setDocsPageSize(Number(e.target.value));
              setDocsPage(0);
            }}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setDocsPage((p) => Math.max(0, p - 1))}
              disabled={docsPage === 0}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() =>
                setDocsPage((p) => (p + 1 < Math.ceil(filteredDocs.length / docsPageSize) ? p + 1 : p))
              }
              disabled={docsPage + 1 >= Math.ceil(filteredDocs.length / docsPageSize)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreditMonitoringSection({
  cmIssues,
  onAddClick,
  onEditClick,
  onToggleResolved,
  onDelete,
  search,
  setSearch,
  resolvedFilter,
  setResolvedFilter,
  page,
  setPage,
  pageSize,
  setPageSize,
}: {
  cmIssues: CmWithClient[];
  onAddClick: () => void;
  onEditClick: (cm: CreditMonitoringRecord) => void;
  onToggleResolved: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  search: string;
  setSearch: (v: string) => void;
  resolvedFilter: "all" | "open" | "resolved";
  setResolvedFilter: (v: "all" | "open" | "resolved") => void;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
}) {
  const pageRows = (rows: CmWithClient[]) => rows.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Credit Monitoring Issues</h2>
          <span className="text-xs text-slate-500">Smart Credit / MFSN / Other</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search CM..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={resolvedFilter}
            onChange={(e) => {
              setResolvedFilter(e.target.value as typeof resolvedFilter);
              setPage(0);
            }}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onClick={() =>
              exportRowsCsv(
                cmIssues.map(({ client, cm }) => ({
                  client: client.name,
                  platform: cm.platform,
                  issue: cm.issue,
                  messageSent: cm.messageSent,
                  messageDate: cm.messageDate,
                  resolved: cm.resolved,
                })),
                "cm-issues.csv",
              )
            }
          >
            Export CSV
          </button>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onClick={() =>
              exportRowsXls(
                cmIssues.map(({ client, cm }) => ({
                  client: client.name,
                  platform: cm.platform,
                  issue: cm.issue,
                  messageSent: cm.messageSent,
                  messageDate: cm.messageDate,
                  resolved: cm.resolved,
                })),
                "cm-issues.xlsx",
                "CM Issues",
              )
            }
          >
            Export XLS
          </button>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            onClick={onAddClick}
          >
            + Add CM Issue
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Platform</th>
              <th className="px-3 py-2 text-left">Issue</th>
              <th className="px-3 py-2 text-left">Message</th>
              <th className="px-3 py-2 text-left">Resolved</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows(cmIssues).map(({ client, cm }) => (
              <tr key={cm.id}>
                <td className="px-3 py-2 font-semibold text-slate-900">{client.name}</td>
                <td className="px-3 py-2 text-slate-700">{cm.platform}</td>
                <td className="px-3 py-2 text-slate-700">{cm.issue}</td>
                <td className="px-3 py-2 text-slate-700">{cm.messageSent ? cm.messageDate || "sent" : "—"}</td>
                <td className="px-3 py-2 text-slate-700">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={cm.resolved}
                      onChange={(e) => onToggleResolved(cm.id, e.target.checked)}
                    />
                    {cm.resolved ? "Resolved" : "Open"}
                  </label>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => onEditClick(cm)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white"
                      onClick={() => onDelete(cm.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cmIssues.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={6}>
                  No credit monitoring issues.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600 mt-3">
        <div>
          Page {page + 1} of {Math.max(1, Math.ceil(cmIssues.length / pageSize))}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => (p + 1 < Math.ceil(cmIssues.length / pageSize) ? p + 1 : p))}
              disabled={page + 1 >= Math.ceil(cmIssues.length / pageSize)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersSection({
  users,
  clients,
  onAdd,
  onEdit,
  onDelete,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  page,
  setPage,
  pageSize,
  setPageSize,
}: {
  users: User[];
  clients: FullClient[];
  onAdd: () => void;
  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
  search: string;
  setSearch: (v: string) => void;
  statusFilter: "all" | User["status"];
  setStatusFilter: (v: "all" | User["status"]) => void;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
}) {
  const stats = useMemo(() => {
    const map = new Map<string, { total: number; overdue: number; issues: number; docsPending: number }>();
    clients.forEach((c) => {
      const key = c.disputer || "Unassigned";
      const entry = map.get(key) || { total: 0, overdue: 0, issues: 0, docsPending: 0 };
      entry.total += 1;
      if (c.issues.some((i) => !i.resolved)) entry.issues += 1;
      if (c.docs.some((d) => d.status === "pending" || d.status === "sent")) entry.docsPending += 1;
      if (c.nextDueDate && parseISO(c.nextDueDate) < new Date()) entry.overdue += 1;
      map.set(key, entry);
    });
    return map;
  }, [clients]);

  const pageRows = users.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Users (Disputers)</h2>
          <p className="text-xs text-slate-500">Manage disputer list; client dropdown pulls from here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(0);
            }}
          >
            <option value="all">Any status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onClick={() =>
              exportRowsCsv(
                users.map((u) => ({
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  status: u.status,
                })),
                "users.csv",
              )
            }
          >
            Export CSV
          </button>
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            onClick={() =>
              exportRowsXls(
                users.map((u) => ({
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  status: u.status,
                })),
                "users.xlsx",
                "Users",
              )
            }
          >
            Export XLS
          </button>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            onClick={onAdd}
          >
            + Add User
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Clients</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((u) => {
              const stat = stats.get(u.name) || { total: 0, overdue: 0, issues: 0, docsPending: 0 };
              return (
                <tr key={u.id}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-3 py-2 text-slate-700">{u.email || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{u.role}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        u.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {stat.total} total · {stat.overdue} overdue · {stat.issues} issues · {stat.docsPending} docs
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                        onClick={() => onEdit(u)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white"
                        onClick={() => onDelete(u.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={6}>
                  No users yet. Add at least one disputer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600 mt-3">
        <div>
          Page {page + 1} of {Math.max(1, Math.ceil(users.length / pageSize))}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Prev
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
              onClick={() => setPage((p) => (p + 1 < Math.ceil(users.length / pageSize) ? p + 1 : p))}
              disabled={page + 1 >= Math.ceil(users.length / pageSize)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientModal({
  open,
  onClose,
  onSave,
  form,
  setForm,
  disputers,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: { name: string; disputer: string; status: ClientProfile["status"]; round: number };
  setForm: (f: { name: string; disputer: string; status: ClientProfile["status"]; round: number }) => void;
  disputers: string[];
  busy: boolean;
}) {
  return (
    <Modal title="Client" open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Name</label>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Disputer</label>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            list="disputer-list"
            value={form.disputer}
            onChange={(e) => setForm({ ...form, disputer: e.target.value })}
            placeholder="Select or type"
          />
          <datalist id="disputer-list">
            {disputers.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientProfile["status"] })}
            >
              {(["Active", "On Hold", "Completed", "Dropped"] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Round</label>
            <input
              type="number"
              min={1}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.round}
              onChange={(e) => setForm({ ...form, round: Number(e.target.value) || 1 })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
            onClick={onSave}
            disabled={busy}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function UserModal({
  open,
  onClose,
  onSave,
  form,
  setForm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: { name: string; email: string; role: string; status: User["status"] };
  setForm: (f: { name: string; email: string; role: string; status: User["status"] }) => void;
  busy: boolean;
}) {
  return (
    <Modal title="User" open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Name</label>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Email</label>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="optional"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Role</label>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as User["status"] })}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
            onClick={onSave}
            disabled={busy}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function IssueModal({
  open,
  onClose,
  onSave,
  form,
  setForm,
  clients,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: { clientId: string; issueType: string; note: string; messageSent: boolean; messageDate: string | null; resolved: boolean };
  setForm: (f: { clientId: string; issueType: string; note: string; messageSent: boolean; messageDate: string | null; resolved: boolean }) => void;
  clients: FullClient[];
  busy: boolean;
}) {
  return (
    <Modal title="Issue" open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Client</label>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Issue type</label>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.issueType}
            onChange={(e) => setForm({ ...form, issueType: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Note</label>
          <textarea
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.messageSent}
              onChange={(e) => setForm({ ...form, messageSent: e.target.checked })}
            />
            Message sent
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.resolved}
              onChange={(e) => setForm({ ...form, resolved: e.target.checked })}
            />
            Resolved
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Message date</label>
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.messageDate || ""}
            onChange={(e) => setForm({ ...form, messageDate: e.target.value })}
            disabled={!form.messageSent}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600" onClick={onSave} disabled={busy}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DocModal({
  open,
  onClose,
  onSave,
  form,
  setForm,
  clients,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: { clientId: string; docType: string; status: DocRecord["status"]; category: DocRecord["category"]; messageSent: boolean; messageDate: string | null; note: string };
  setForm: (f: { clientId: string; docType: string; status: DocRecord["status"]; category: DocRecord["category"]; messageSent: boolean; messageDate: string | null; note: string }) => void;
  clients: FullClient[];
  busy: boolean;
}) {
  return (
    <Modal title="Document" open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Client</label>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Document type</label>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.docType}
            onChange={(e) => setForm({ ...form, docType: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Category</label>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as DocRecord["category"] })}
            >
              <option value="completing">Completing</option>
              <option value="updating">Updating</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as DocRecord["status"] })}
            >
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="complete">Complete</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.messageSent}
              onChange={(e) => setForm({ ...form, messageSent: e.target.checked })}
            />
            Message sent
          </label>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Message date</label>
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.messageDate || ""}
              onChange={(e) => setForm({ ...form, messageDate: e.target.value })}
              disabled={!form.messageSent}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Note</label>
          <textarea
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600" onClick={onSave} disabled={busy}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CmModal({
  open,
  onClose,
  onSave,
  form,
  setForm,
  clients,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: { clientId: string; platform: string; issue: string; messageSent: boolean; messageDate: string | null; resolved: boolean };
  setForm: (f: { clientId: string; platform: string; issue: string; messageSent: boolean; messageDate: string | null; resolved: boolean }) => void;
  clients: FullClient[];
  busy: boolean;
}) {
  return (
    <Modal title="Credit Monitoring" open={open} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Client</label>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Platform</label>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Issue</label>
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.issue}
              onChange={(e) => setForm({ ...form, issue: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.messageSent}
              onChange={(e) => setForm({ ...form, messageSent: e.target.checked })}
            />
            Message sent
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.resolved}
              onChange={(e) => setForm({ ...form, resolved: e.target.checked })}
            />
            Resolved
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Message date</label>
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.messageDate || ""}
            onChange={(e) => setForm({ ...form, messageDate: e.target.value })}
            disabled={!form.messageSent}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600" onClick={onSave} disabled={busy}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
