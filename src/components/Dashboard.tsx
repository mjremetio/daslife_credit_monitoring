"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, isWithinInterval, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  FileSpreadsheet,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
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
} from "@/lib/api-client";
import { FullClient, DocRecord, CreditMonitoringRecord, ClientProfile, User } from "@/types/models";
import { exportCsv, exportXls } from "@/lib/exporters";
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

  const issues = useMemo(() =>
    clients.flatMap((c) => c.issues.map((i) => ({ client: c, issue: i }))),
  [clients]);

  const docs = useMemo(() =>
    clients.flatMap((c) => c.docs.map((d) => ({ client: c, doc: d }))),
  [clients]);

  const cmIssues = useMemo(() =>
    clients.flatMap((c) => c.cmIssues.map((cm) => ({ client: c, cm }))),
  [clients]);

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

  const handleQuickIssue = async (payload: { clientId: string; issueType: string; note: string }) => {
    setBusy(true);
    await addIssue({ ...payload, messageSent: false, resolved: false });
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

  const handleAddDoc = async (payload: { clientId: string; docType: string; category: DocRecord["category"] }) => {
    setBusy(true);
    await addDoc({ ...payload, status: "pending", messageSent: false });
    await refresh();
    setBusy(false);
  };

  const handleAddCm = async (payload: { clientId: string; platform: string; issue: string }) => {
    setBusy(true);
    await addCmIssue({ ...payload, messageSent: false, resolved: false });
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Ready to Process Queue</h2>
            <span className="text-sm text-slate-500">Click “Mark Processed” to advance round & due date</span>
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
                {readyQueue.map((c) => (
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
                {readyQueue.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={6}>
                      No clients in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Issues */}
      {activeTab === "issues" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Dues with Issues</h2>
              <div className="text-xs text-slate-500">Toggle to resolve</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Client</th>
                    <th className="px-3 py-2 text-left">Issue</th>
                    <th className="px-3 py-2 text-left">Message</th>
                    <th className="px-3 py-2 text-left">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issues.map(({ client, issue }) => (
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
                    </tr>
                  ))}
                  {issues.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={4}>
                        No issues logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Quick add issue</h2>
              <ShieldAlert size={18} className="text-orange-500" />
            </div>
            <QuickIssueForm clients={clients} onSubmit={handleQuickIssue} busy={busy} />
          </div>
        </div>
      )}

      {/* Docs */}
      {activeTab === "docs" && <DocsSection docs={docs} clients={clients} onAdd={handleAddDoc} />}

      {/* Credit Monitoring */}
      {activeTab === "cm" && <CreditMonitoringSection cmIssues={cmIssues} clients={clients} onAdd={handleAddCm} />}

      {/* Users / Disputers */}
      {activeTab === "users" && (
        <UsersSection
          clients={clients}
          users={users}
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
      />
      </div>
    </div>
  );
}

function QuickIssueForm({ clients, onSubmit, busy }: { clients: FullClient[]; onSubmit: (p: { clientId: string; issueType: string; note: string }) => void; busy: boolean }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [issueType, setIssueType] = useState("Proof of Address");
  const [note, setNote] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!clientId) return;
        onSubmit({ clientId, issueType, note });
        setNote("");
      }}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">Client</label>
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
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
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-600">Note</label>
        <textarea
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 disabled:opacity-50"
        disabled={busy || !clientId}
      >
        <AlertTriangle size={16} /> Add issue
      </button>
    </form>
  );
}

type DocWithClient = { client: FullClient; doc: DocRecord };
type CmWithClient = { client: FullClient; cm: CreditMonitoringRecord };

function DocsSection({
  docs,
  clients,
  onAdd,
}: {
  docs: DocWithClient[];
  clients: FullClient[];
  onAdd: (payload: { clientId: string; docType: string; category: DocRecord["category"] }) => void;
}) {
  const completing = docs.filter(({ doc }) => doc.category === "completing");
  const updating = docs.filter(({ doc }) => doc.category === "updating");

  const renderTable = (rows: DocWithClient[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Client</th>
            <th className="px-3 py-2 text-left">Doc</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ client, doc }) => (
            <tr key={doc.id}>
              <td className="px-3 py-2 font-semibold text-slate-900">{client.name}</td>
              <td className="px-3 py-2 text-slate-700">{doc.docType}</td>
              <td className="px-3 py-2 text-slate-700 capitalize">{doc.status}</td>
              <td className="px-3 py-2 text-slate-700">{doc.messageSent ? doc.messageDate || "sent" : "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={4}>
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Document Trackers</h2>
        <span className="text-xs text-slate-500">Completing vs Updating</span>
      </div>
      <div className="mb-4 grid gap-2 md:grid-cols-4">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          onChange={(e) => onAdd({ clientId: e.target.value, docType: "ID", category: "completing" })}
          defaultValue=""
        >
          <option value="" disabled>
            Quick-add doc for client
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Completing Docs</h3>
          {renderTable(completing)}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Updating Docs</h3>
          {renderTable(updating)}
        </div>
      </div>
    </div>
  );
}

function CreditMonitoringSection({
  cmIssues,
  clients,
  onAdd,
}: {
  cmIssues: CmWithClient[];
  clients: FullClient[];
  onAdd: (payload: { clientId: string; platform: string; issue: string }) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Credit Monitoring Issues</h2>
        <span className="text-xs text-slate-500">Smart Credit / MFSN / Other</span>
      </div>
      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          defaultValue=""
          onChange={(e) => e.target.value && onAdd({ clientId: e.target.value, platform: "Smart Credit", issue: "Follow-up" })}
        >
          <option value="" disabled>
            Quick-add CM issue for client
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cmIssues.map(({ client, cm }) => (
              <tr key={cm.id}>
                <td className="px-3 py-2 font-semibold text-slate-900">{client.name}</td>
                <td className="px-3 py-2 text-slate-700">{cm.platform}</td>
                <td className="px-3 py-2 text-slate-700">{cm.issue}</td>
                <td className="px-3 py-2 text-slate-700">{cm.messageSent ? cm.messageDate || "sent" : "—"}</td>
                <td className="px-3 py-2 text-slate-700">{cm.resolved ? "Yes" : "No"}</td>
              </tr>
            ))}
            {cmIssues.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={5}>
                  No credit monitoring issues.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
}: {
  users: User[];
  clients: FullClient[];
  onAdd: () => void;
  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Users (Disputers)</h2>
          <p className="text-xs text-slate-500">Manage disputer list; client dropdown pulls from here.</p>
        </div>
        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
          onClick={onAdd}
        >
          + Add User
        </button>
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
            {users.map((u) => {
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
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: { name: string; disputer: string; status: ClientProfile["status"]; round: number };
  setForm: (f: { name: string; disputer: string; status: ClientProfile["status"]; round: number }) => void;
  disputers: string[];
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
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: { name: string; email: string; role: string; status: User["status"] };
  setForm: (f: { name: string; email: string; role: string; status: User["status"] }) => void;
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
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
