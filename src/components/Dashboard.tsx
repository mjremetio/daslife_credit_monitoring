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
import { fetchClients, markProcessed, toggleIssueResolved, addIssue } from "@/lib/api-client";
import { FullClient, DocRecord, CreditMonitoringRecord } from "@/types/models";
import { exportCsv, exportXls } from "@/lib/exporters";

const today = new Date();

const formatDate = (value: string | null) => (value ? new Date(value + "T00:00:00").toLocaleDateString() : "—");

const isOverdue = (c: FullClient) => c.nextDueDate && parseISO(c.nextDueDate) < today;
const dueWithin = (c: FullClient, days: number) =>
  c.nextDueDate && isWithinInterval(parseISO(c.nextDueDate), { start: today, end: addDays(today, days) });

export function Dashboard({ initialData }: { initialData: FullClient[] }) {
  const [clients, setClients] = useState<FullClient[]>(initialData);
  const [search, setSearch] = useState("");
  const [disputerFilter, setDisputerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "clients" | "ready" | "issues" | "docs" | "cm" | "users">("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    setBusy(true);
    try {
      const data = await fetchClients();
      setClients(data);
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

  const disputers = Array.from(new Set(clients.map((c) => c.disputer).filter(Boolean)));

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
      {activeTab === "docs" && <DocsSection docs={docs} />}

      {/* Credit Monitoring */}
      {activeTab === "cm" && <CreditMonitoringSection cmIssues={cmIssues} />}

      {/* Users / Disputers */}
      {activeTab === "users" && <UsersSection clients={clients} />}

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
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Client Master List</h2>
              <span className="text-xs text-slate-500">Search & filter above, sort columns in table.</span>
            </div>
            <ClientsTable data={filtered} />
          </div>
        </section>
      )}
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

function DocsSection({ docs }: { docs: DocWithClient[] }) {
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

function CreditMonitoringSection({ cmIssues }: { cmIssues: CmWithClient[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Credit Monitoring Issues</h2>
        <span className="text-xs text-slate-500">Smart Credit / MFSN / Other</span>
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

function UsersSection({ clients }: { clients: FullClient[] }) {
  const stats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; overdue: number; issues: number; docsPending: number }
    >();
    clients.forEach((c) => {
      const key = c.disputer || "Unassigned";
      const entry = map.get(key) || { total: 0, overdue: 0, issues: 0, docsPending: 0 };
      entry.total += 1;
      if (c.issues.some((i) => !i.resolved)) entry.issues += 1;
      if (c.docs.some((d) => d.status === "pending" || d.status === "sent")) entry.docsPending += 1;
      if (c.nextDueDate && parseISO(c.nextDueDate) < new Date()) entry.overdue += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([disputer, data]) => ({ disputer, ...data }));
  }, [clients]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Users (Disputers)</h2>
        <span className="text-xs text-slate-500">Derived from client assignments</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Disputer</th>
              <th className="px-3 py-2 text-left">Clients</th>
              <th className="px-3 py-2 text-left">Overdue</th>
              <th className="px-3 py-2 text-left">Open Issues</th>
              <th className="px-3 py-2 text-left">Docs Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.map((row) => (
              <tr key={row.disputer}>
                <td className="px-3 py-2 font-semibold text-slate-900">{row.disputer}</td>
                <td className="px-3 py-2 text-slate-700">{row.total}</td>
                <td className="px-3 py-2 text-slate-700">{row.overdue}</td>
                <td className="px-3 py-2 text-slate-700">{row.issues}</td>
                <td className="px-3 py-2 text-slate-700">{row.docsPending}</td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={5}>
                  No disputers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
