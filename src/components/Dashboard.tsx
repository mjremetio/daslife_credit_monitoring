"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, isBefore, isValid, parseISO } from "date-fns";
import { ArrowDownToLine, ArrowUpRight, CloudUpload, FileDown, FileSpreadsheet, RefreshCcw, Search } from "lucide-react";
import { ClientsTable } from "./ClientsTable";
import { MetricCard } from "./MetricCard";
import { ConnectionBadge } from "./ConnectionBadge";
import { fetchClients, pushClients, checkConnection } from "@/lib/api-client";
import { parseClientFile } from "@/lib/importers";
import { exportCsv, exportXls } from "@/lib/exporters";
import { ClientRecord, SheetSource } from "@/types/client";
import { normalizeFromAny } from "@/lib/transform";

interface DashboardProps {
  initialData: ClientRecord[];
}

const isOverdue = (record: ClientRecord) => {
  if (!record.nextDueDate) return false;
  const date = parseISO(record.nextDueDate);
  return isValid(date) && isBefore(date, new Date());
};

const isDueSoon = (record: ClientRecord, days = 7) => {
  if (!record.nextDueDate) return false;
  const date = parseISO(record.nextDueDate);
  if (!isValid(date)) return false;
  const now = new Date();
  return isBefore(date, addDays(now, days)) && !isBefore(date, now);
};

const normalizeList = (data: Array<ClientRecord | Record<string, unknown>>) =>
  data.map((row, idx) => normalizeFromAny(row as Record<string, unknown>, idx));

export function Dashboard({ initialData }: DashboardProps) {
  const [clients, setClients] = useState<ClientRecord[]>(normalizeList(initialData));
  const [filtered, setFiltered] = useState<ClientRecord[]>(normalizeList(initialData));
  const [source, setSource] = useState<SheetSource>("sample");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [disputerFilter, setDisputerFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState("all");
  const [issueFilter, setIssueFilter] = useState("all");
  const [dueWindow, setDueWindow] = useState("all");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const refreshData = useCallback(async () => {
    setBusy(true);
    try {
      const payload = await fetchClients();
      setClients(payload.data);
      setSource(payload.source);
      setLastSyncedAt(payload.lastSyncedAt);
      setStatusMessage(payload.error ?? null);
    } catch (error) {
      setStatusMessage(`Refresh failed: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const pingConnection = useCallback(async () => {
    const status = await checkConnection();
    setConnected(status.connected);
    if (!status.connected && status.reason) setStatusMessage(status.reason);
  }, []);

  useEffect(() => {
    refreshData();
    pingConnection();
  }, [refreshData, pingConnection]);

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const filteredRecords = clients.filter((record) => {
      const matchesSearch =
        record.clientName.toLowerCase().includes(lower) ||
        record.disputer.toLowerCase().includes(lower) ||
        record.notes.toLowerCase().includes(lower) ||
        record.issues.toLowerCase().includes(lower);

      const matchesDisputer = disputerFilter === "all" || record.disputer === disputerFilter;
      const matchesRound =
        roundFilter === "all" || String(record.currentRound ?? "") === roundFilter;
      const hasIssue = record.issues && record.issues.trim().length > 0 && record.issues.toLowerCase() !== "none";
      const matchesIssues =
        issueFilter === "all" || (issueFilter === "open" && hasIssue) || (issueFilter === "clear" && !hasIssue);

      let matchesDue = true;
      if (dueWindow === "overdue") matchesDue = isOverdue(record);
      if (dueWindow === "next7") matchesDue = isDueSoon(record, 7);
      if (dueWindow === "next14") matchesDue = isDueSoon(record, 14);

      return matchesSearch && matchesDisputer && matchesRound && matchesIssues && matchesDue;
    });
    setFiltered(filteredRecords);
  }, [clients, searchTerm, disputerFilter, roundFilter, issueFilter, dueWindow]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      setBusy(true);
      const records = await parseClientFile(file);
      setClients(records);
      setStatusMessage(`Imported ${records.length} rows from ${file.name}`);
    } catch (error) {
      setStatusMessage(`Import failed: ${String(error)}`);
    } finally {
      setBusy(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const handleSync = async () => {
    try {
      setBusy(true);
      await pushClients(clients);
      setStatusMessage("Synced to Google Sheet successfully");
      setLastSyncedAt(new Date().toISOString());
      setSource("google-sheet");
    } catch (error) {
      setStatusMessage(`Sync failed: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => {
    const total = clients.length;
    const overdue = clients.filter(isOverdue).length;
    const dueSoon = clients.filter((r) => isDueSoon(r, 7)).length;
    const withIssues = clients.filter(
      (r) => r.issues && r.issues.trim().length > 0 && r.issues.toLowerCase() !== "none",
    ).length;
    return { total, overdue, dueSoon, withIssues };
  }, [clients]);

  const disputerOptions = useMemo(
    () => Array.from(new Set(clients.map((c) => c.disputer).filter(Boolean))),
    [clients],
  );

  const roundOptions = useMemo(
    () =>
      Array.from(new Set(clients.map((c) => c.currentRound).filter((v) => v !== null))).map((r) => String(r)),
    [clients],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
      <header className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-sky-100/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">Das Life & Credit Solutions</p>
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
              Credit Status Monitoring
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Track dispute rounds, due dates, and sheet connectivity. Import from CSV/XLS, sync back to Google
              Sheets via secured Apps Script, and stay ahead of due dates.
            </p>
            <ConnectionBadge connected={connected} source={source} lastSyncedAt={lastSyncedAt} reason={statusMessage ?? undefined} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
              onClick={refreshData}
              disabled={busy}
            >
              <RefreshCcw size={16} /> Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-600 disabled:opacity-50"
              onClick={() => uploadRef.current?.click()}
              disabled={busy}
            >
              <CloudUpload size={16} /> Import CSV/XLS
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:border-slate-300"
              onClick={() => exportCsv(clients)}
              disabled={clients.length === 0}
            >
              <FileDown size={16} /> Export CSV
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:border-slate-300"
              onClick={() => exportXls(clients)}
              disabled={clients.length === 0}
            >
              <FileSpreadsheet size={16} /> Export XLS
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-50"
              onClick={handleSync}
              disabled={busy || clients.length === 0}
            >
              <ArrowUpRight size={16} /> Sync to Sheet
            </button>
          </div>
        </div>
        {statusMessage && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            <ArrowDownToLine size={14} /> {statusMessage}
          </p>
        )}
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Clients" value={stats.total} helper="Total records loaded" accent="blue" />
        <MetricCard label="Overdue" value={stats.overdue} helper="Next round date past today" accent="red" />
        <MetricCard label="Due soon" value={stats.dueSoon} helper="Next 7 days" accent="amber" />
        <MetricCard label="With issues" value={stats.withIssues} helper="Marked as needing attention" accent="green" />
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner">
            <Search size={16} className="text-slate-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              {disputerOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All rounds</option>
              {roundOptions.map((r) => (
                <option key={r} value={r}>
                  Round {r}
                </option>
              ))}
            </select>
            <select
              value={dueWindow}
              onChange={(e) => setDueWindow(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All due dates</option>
              <option value="next7">Due next 7 days</option>
              <option value="next14">Due next 14 days</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Issues: any</option>
              <option value="open">With issues</option>
              <option value="clear">No issues</option>
            </select>
          </div>
        </div>

        <div className="mt-5">
          <ClientsTable data={filtered} />
        </div>
      </section>
    </div>
  );
}
