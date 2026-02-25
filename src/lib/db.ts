import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { ClientProfile, IssueRecord, CreditMonitoringRecord, DocRecord, DocCategory, DocStatus } from "@/types/models";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.sqlite");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

// pragma for better concurrency in serverless context
db.pragma("journal_mode = WAL");

export function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      onboard_date TEXT,
      disputer TEXT,
      status TEXT DEFAULT 'Active',
      round INTEGER DEFAULT 1,
      date_processed TEXT,
      next_due_date TEXT,
      notes TEXT,
      flags TEXT,
      is_new INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      issue_type TEXT,
      message_sent INTEGER DEFAULT 0,
      message_date TEXT,
      resolved INTEGER DEFAULT 0,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS cm_issues (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      platform TEXT,
      issue TEXT,
      message_sent INTEGER DEFAULT 0,
      message_date TEXT,
      resolved INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      doc_type TEXT,
      status TEXT,
      message_sent INTEGER DEFAULT 0,
      message_date TEXT,
      note TEXT,
      category TEXT
    );
  `);
}

ensureSchema();

export const dbHandle = db;

export function upsertClients(clients: ClientProfile[]) {
  const stmt = db.prepare(`
    INSERT INTO clients (id, name, onboard_date, disputer, status, round, date_processed, next_due_date, notes, flags, is_new)
    VALUES (@id, @name, @onboardDate, @disputer, @status, @round, @dateProcessed, @nextDueDate, @notes, @flags, @isNew)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      onboard_date=excluded.onboard_date,
      disputer=excluded.disputer,
      status=excluded.status,
      round=excluded.round,
      date_processed=excluded.date_processed,
      next_due_date=excluded.next_due_date,
      notes=excluded.notes,
      flags=excluded.flags,
      is_new=excluded.is_new;
  `);
  const trx = db.transaction((items: ClientProfile[]) => {
    items.forEach((c) => stmt.run(c));
  });
  trx(clients);
}

export function replaceAllData(opts: {
  clients: ClientProfile[];
  issues: IssueRecord[];
  cmIssues: CreditMonitoringRecord[];
  docs: DocRecord[];
}) {
  const { clients, issues, cmIssues, docs } = opts;
  const truncate = db.transaction(() => {
    db.exec("DELETE FROM issues; DELETE FROM cm_issues; DELETE FROM docs; DELETE FROM clients;");
    upsertClients(clients);
    batchInsertIssues(issues);
    batchInsertCm(cmIssues);
    batchInsertDocs(docs);
  });
  truncate();
}

const insertIssue = db.prepare(`
  INSERT OR REPLACE INTO issues (id, client_id, issue_type, message_sent, message_date, resolved, note)
  VALUES (@id, @clientId, @issueType, @messageSent, @messageDate, @resolved, @note)
`);

export function batchInsertIssues(rows: IssueRecord[]) {
  const trx = db.transaction((items: IssueRecord[]) => items.forEach((r) => insertIssue.run({
    ...r,
    messageSent: r.messageSent ? 1 : 0,
    resolved: r.resolved ? 1 : 0,
  })));
  trx(rows);
}

const insertCm = db.prepare(`
  INSERT OR REPLACE INTO cm_issues (id, client_id, platform, issue, message_sent, message_date, resolved)
  VALUES (@id, @clientId, @platform, @issue, @messageSent, @messageDate, @resolved)
`);

export function batchInsertCm(rows: CreditMonitoringRecord[]) {
  const trx = db.transaction((items: CreditMonitoringRecord[]) => items.forEach((r) => insertCm.run({
    ...r,
    messageSent: r.messageSent ? 1 : 0,
    resolved: r.resolved ? 1 : 0,
  })));
  trx(rows);
}

const insertDoc = db.prepare(`
  INSERT OR REPLACE INTO docs (id, client_id, doc_type, status, message_sent, message_date, note, category)
  VALUES (@id, @clientId, @docType, @status, @messageSent, @messageDate, @note, @category)
`);

export function batchInsertDocs(rows: DocRecord[]) {
  const trx = db.transaction((items: DocRecord[]) => items.forEach((r) => insertDoc.run({
    ...r,
    messageSent: r.messageSent ? 1 : 0,
  })));
  trx(rows);
}

export function fetchFullClients() {
  type ClientRow = {
    id: string;
    name: string;
    onboard_date: string | null;
    disputer: string | null;
    status: string | null;
    round: number;
    date_processed: string | null;
    next_due_date: string | null;
    notes: string | null;
    flags: string | null;
    is_new: number;
  };

  const clientRows = db.prepare("SELECT * FROM clients").all() as ClientRow[];
  type IssueRow = { id: string; client_id: string; issue_type: string; message_sent: number; message_date: string | null; resolved: number; note: string | null };
  type CmRow = { id: string; client_id: string; platform: string; issue: string; message_sent: number; message_date: string | null; resolved: number };
  type DocRow = { id: string; client_id: string; doc_type: string; status: string; message_sent: number; message_date: string | null; note: string | null; category: string | null };

  const issues = db.prepare("SELECT * FROM issues").all() as IssueRow[];
  const cmIssues = db.prepare("SELECT * FROM cm_issues").all() as CmRow[];
  const docs = db.prepare("SELECT * FROM docs").all() as DocRow[];

  const issuesByClient = issues.reduce<Record<string, IssueRecord[]>>((acc, row) => {
    const key = row.client_id as string;
    acc[key] = acc[key] || [];
    acc[key].push({
      id: row.id,
      clientId: key,
      issueType: row.issue_type,
      messageSent: Boolean(row.message_sent),
      messageDate: row.message_date,
      resolved: Boolean(row.resolved),
      note: row.note ?? "",
    });
    return acc;
  }, {});

  const cmByClient = cmIssues.reduce<Record<string, CreditMonitoringRecord[]>>((acc, row) => {
    const key = row.client_id as string;
    acc[key] = acc[key] || [];
    acc[key].push({
      id: row.id,
      clientId: key,
      platform: row.platform,
      issue: row.issue,
      messageSent: Boolean(row.message_sent),
      messageDate: row.message_date,
      resolved: Boolean(row.resolved),
    });
    return acc;
  }, {});

  const docsByClient = docs.reduce<Record<string, DocRecord[]>>((acc, row) => {
    const key = row.client_id as string;
    acc[key] = acc[key] || [];
    acc[key].push({
      id: row.id,
      clientId: key,
      docType: row.doc_type,
      status: row.status as DocStatus,
      messageSent: Boolean(row.message_sent),
      messageDate: row.message_date,
      note: row.note ?? "",
      category: (row.category || "completing") as DocCategory,
    });
    return acc;
  }, {});

  return clientRows.map((c) => ({
    id: c.id,
    name: c.name,
    onboardDate: c.onboard_date,
    disputer: c.disputer || "",
    status: (c.status || "Active") as ClientProfile["status"],
    round: Number(c.round) || 1,
    dateProcessed: c.date_processed,
    nextDueDate: c.next_due_date,
    notes: c.notes || "",
    flags: c.flags || "",
    isNew: Boolean(c.is_new),
    issues: issuesByClient[c.id] || [],
    cmIssues: cmByClient[c.id] || [],
    docs: docsByClient[c.id] || [],
  }));
}

export function markProcessed(clientId: string, todayIso: string) {
  const client = db.prepare("SELECT round FROM clients WHERE id = ?").get(clientId) as { round: number } | undefined;
  if (!client) return;
  const nextRound = (client.round || 1) + 1;
  const nextDue = new Date(todayIso);
  nextDue.setDate(nextDue.getDate() + 30);
  db.prepare(`
    UPDATE clients
    SET round = ?, date_processed = ?, next_due_date = ?, is_new = 0
    WHERE id = ?
  `).run(nextRound, todayIso, nextDue.toISOString().slice(0, 10), clientId);
}

export function toggleIssueResolved(issueId: string, resolved: boolean) {
  db.prepare("UPDATE issues SET resolved = ? WHERE id = ?").run(resolved ? 1 : 0, issueId);
}

export function addIssue(row: IssueRecord) {
  insertIssue.run({
    ...row,
    messageSent: row.messageSent ? 1 : 0,
    resolved: row.resolved ? 1 : 0,
  });
}

export function addDoc(row: DocRecord) {
  insertDoc.run({
    ...row,
    messageSent: row.messageSent ? 1 : 0,
  });
}

export function addCmIssue(row: CreditMonitoringRecord) {
  insertCm.run({
    ...row,
    messageSent: row.messageSent ? 1 : 0,
    resolved: row.resolved ? 1 : 0,
  });
}
