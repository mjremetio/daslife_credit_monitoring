import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  ClientProfile,
  IssueRecord,
  CreditMonitoringRecord,
  DocRecord,
  DocCategory,
  DocStatus,
  User,
  DisputeRecord,
  RoundHistory,
  MessageRecord,
} from "../types/models";

// Use writable location for serverless (Vercel) – /tmp by default
const dataDir = process.env.SQLITE_DIR || path.join("/tmp", "daslife_data");
const dbPath = process.env.SQLITE_PATH || path.join(dataDir, "db.sqlite");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

// pragma for better concurrency in serverless context
db.pragma("journal_mode = WAL");

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

type IssueRow = { id: string; client_id: string; issue_type: string; message_sent: number; message_date: string | null; resolved: number; note: string | null; round?: number | null; priority?: string | null };
type CmRow = { id: string; client_id: string; platform: string; issue: string; message_sent: number; message_date: string | null; resolved: number; round?: number | null; priority?: string | null };
type DocRow = { id: string; client_id: string; doc_type: string; status: string; message_sent: number; message_date: string | null; note: string | null; category: string | null; round?: number | null; priority?: string | null };
type UserRow = { id: string; name: string; email: string; role: string; status: string };
type DisputeRow = {
  id: string;
  client_id: string;
  round: number;
  bureau: string;
  status: string;
  sent_date: string | null;
  due_date: string | null;
  outcome: string;
  priority: string;
  notes: string;
  blocker_flags: string;
};
type RoundRow = { id: string; client_id: string; round: number; processed_date: string | null; next_due_date: string | null; status_note: string };
type MessageRow = { id: string; client_id: string; dispute_id: string | null; template_key: string; channel: string; sent_at: string; content_preview: string };

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
      note TEXT,
      round INTEGER,
      priority TEXT
    );

    CREATE TABLE IF NOT EXISTS cm_issues (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      platform TEXT,
      issue TEXT,
      message_sent INTEGER DEFAULT 0,
      message_date TEXT,
      resolved INTEGER DEFAULT 0,
      round INTEGER,
      priority TEXT
    );

    CREATE TABLE IF NOT EXISTS docs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      doc_type TEXT,
      status TEXT,
      message_sent INTEGER DEFAULT 0,
      message_date TEXT,
      note TEXT,
      category TEXT,
      round INTEGER,
      priority TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT,
      status TEXT DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS round_history (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      round INTEGER,
      processed_date TEXT,
      next_due_date TEXT,
      status_note TEXT
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      round INTEGER,
      bureau TEXT,
      status TEXT,
      sent_date TEXT,
      due_date TEXT,
      outcome TEXT,
      priority TEXT,
      notes TEXT,
      blocker_flags TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      dispute_id TEXT,
      template_key TEXT,
      channel TEXT,
      sent_at TEXT,
      content_preview TEXT
    );
  `);

  // Add missing columns if schema already existed
  ["issues", "cm_issues", "docs"].forEach((table) => {
    ["round", "priority"].forEach((col) => {
      try {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${col === "round" ? "INTEGER" : "TEXT"}`).run();
      } catch {
        /* ignore */
      }
    });
  });
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

export function addClient(client: ClientProfile) {
  upsertClients([client]);
}

export function deleteClient(clientId: string) {
  db.prepare("DELETE FROM clients WHERE id = ?").run(clientId);
}

export function replaceAllData(opts: {
  clients: ClientProfile[];
  issues: IssueRecord[];
  cmIssues: CreditMonitoringRecord[];
  docs: DocRecord[];
  users?: User[];
  disputes?: DisputeRecord[];
  rounds?: RoundHistory[];
  messages?: MessageRecord[];
}) {
  const { clients, issues, cmIssues, docs, users, disputes = [], rounds = [], messages = [] } = opts;
  const userList = users ?? fetchUsers();
  const truncate = db.transaction(() => {
    db.exec(
      "DELETE FROM issues; DELETE FROM cm_issues; DELETE FROM docs; DELETE FROM clients; DELETE FROM users; DELETE FROM disputes; DELETE FROM round_history; DELETE FROM messages;",
    );
    upsertClients(clients);
    batchInsertIssues(issues);
    batchInsertCm(cmIssues);
    batchInsertDocs(docs);
    batchInsertUsers(userList);
    batchInsertDisputes(disputes);
    batchInsertRounds(rounds);
    batchInsertMessages(messages);
  });
  truncate();
}

const insertIssue = db.prepare(`
  INSERT OR REPLACE INTO issues (id, client_id, issue_type, message_sent, message_date, resolved, note, round, priority)
  VALUES (@id, @clientId, @issueType, @messageSent, @messageDate, @resolved, @note, @round, @priority)
`);

export function batchInsertIssues(rows: IssueRecord[]) {
  const trx = db.transaction((items: IssueRecord[]) => items.forEach((r) => insertIssue.run({
    ...r,
    messageSent: r.messageSent ? 1 : 0,
    resolved: r.resolved ? 1 : 0,
    round: r.round ?? null,
    priority: r.priority ?? "Medium",
  })));
  trx(rows);
}

const insertCm = db.prepare(`
  INSERT OR REPLACE INTO cm_issues (id, client_id, platform, issue, message_sent, message_date, resolved, round, priority)
  VALUES (@id, @clientId, @platform, @issue, @messageSent, @messageDate, @resolved, @round, @priority)
`);

export function batchInsertCm(rows: CreditMonitoringRecord[]) {
  const trx = db.transaction((items: CreditMonitoringRecord[]) => items.forEach((r) => insertCm.run({
    ...r,
    messageSent: r.messageSent ? 1 : 0,
    resolved: r.resolved ? 1 : 0,
    round: r.round ?? null,
    priority: r.priority ?? "Medium",
  })));
  trx(rows);
}

const insertDoc = db.prepare(`
  INSERT OR REPLACE INTO docs (id, client_id, doc_type, status, message_sent, message_date, note, category, round, priority)
  VALUES (@id, @clientId, @docType, @status, @messageSent, @messageDate, @note, @category, @round, @priority)
`);

export function batchInsertDocs(rows: DocRecord[]) {
  const trx = db.transaction((items: DocRecord[]) => items.forEach((r) => insertDoc.run({
    ...r,
    messageSent: r.messageSent ? 1 : 0,
    round: r.round ?? null,
    priority: r.priority ?? "Medium",
  })));
  trx(rows);
}

const insertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, name, email, role, status)
  VALUES (@id, @name, @email, @role, @status)
`);

const insertDispute = db.prepare(`
  INSERT OR REPLACE INTO disputes (id, client_id, round, bureau, status, sent_date, due_date, outcome, priority, notes, blocker_flags)
  VALUES (@id, @clientId, @round, @bureau, @status, @sentDate, @dueDate, @outcome, @priority, @notes, @blockerFlags)
`);

const insertRound = db.prepare(`
  INSERT OR REPLACE INTO round_history (id, client_id, round, processed_date, next_due_date, status_note)
  VALUES (@id, @clientId, @round, @processedDate, @nextDueDate, @statusNote)
`);

const insertMessage = db.prepare(`
  INSERT OR REPLACE INTO messages (id, client_id, dispute_id, template_key, channel, sent_at, content_preview)
  VALUES (@id, @clientId, @disputeId, @templateKey, @channel, @sentAt, @contentPreview)
`);

export function batchInsertUsers(rows: User[]) {
  const trx = db.transaction((items: User[]) => items.forEach((u) => insertUser.run(u)));
  trx(rows);
}

export function batchInsertDisputes(rows: DisputeRecord[]) {
  const trx = db.transaction((items: DisputeRecord[]) => items.forEach((d) => insertDispute.run(d)));
  trx(rows);
}

export function batchInsertRounds(rows: RoundHistory[]) {
  const trx = db.transaction((items: RoundHistory[]) => items.forEach((r) => insertRound.run(r)));
  trx(rows);
}

export function batchInsertMessages(rows: MessageRecord[]) {
  const trx = db.transaction((items: MessageRecord[]) => items.forEach((m) => insertMessage.run(m)));
  trx(rows);
}

export function addUser(user: User) {
  insertUser.run(user);
}

export function updateUser(user: User) {
  insertUser.run(user);
}

export function deleteUser(userId: string) {
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function fetchFullClients() {
  const clientRows = db.prepare("SELECT * FROM clients").all() as ClientRow[];
  const issues = db.prepare("SELECT * FROM issues").all() as IssueRow[];
  const cmIssues = db.prepare("SELECT * FROM cm_issues").all() as CmRow[];
  const docs = db.prepare("SELECT * FROM docs").all() as DocRow[];
  const disputes = db.prepare("SELECT * FROM disputes").all() as DisputeRow[];
  const rounds = db.prepare("SELECT * FROM round_history").all() as RoundRow[];
  const messages = db.prepare("SELECT * FROM messages").all() as MessageRow[];

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
      round: row.round ?? null,
      priority: (row.priority || "Medium") as IssueRecord["priority"],
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
      round: row.round ?? null,
      priority: (row.priority || "Medium") as CreditMonitoringRecord["priority"],
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
      round: row.round ?? null,
      priority: (row.priority || "Medium") as DocRecord["priority"],
    });
    return acc;
  }, {});

  const disputesByClient = disputes.reduce<Record<string, DisputeRecord[]>>((acc, row) => {
    const key = row.client_id as string;
    acc[key] = acc[key] || [];
    acc[key].push({
      id: row.id,
      clientId: key,
      round: row.round,
      bureau: row.bureau,
      status: row.status as DisputeRecord["status"],
      sentDate: row.sent_date,
      dueDate: row.due_date,
      outcome: row.outcome,
      priority: (row.priority || "Medium") as DisputeRecord["priority"],
      notes: row.notes,
      blockerFlags: row.blocker_flags,
    });
    return acc;
  }, {});

  const roundsByClient = rounds.reduce<Record<string, RoundHistory[]>>((acc, row) => {
    const key = row.client_id as string;
    acc[key] = acc[key] || [];
    acc[key].push({
      id: row.id,
      clientId: key,
      round: row.round,
      processedDate: row.processed_date,
      nextDueDate: row.next_due_date,
      statusNote: row.status_note,
    });
    return acc;
  }, {});

  const messagesByClient = messages.reduce<Record<string, MessageRecord[]>>((acc, row) => {
    const key = row.client_id as string;
    acc[key] = acc[key] || [];
    acc[key].push({
      id: row.id,
      clientId: key,
      disputeId: row.dispute_id,
      templateKey: row.template_key,
      channel: row.channel,
      sentAt: row.sent_at,
      contentPreview: row.content_preview,
    });
    return acc;
  }, {});

  const enriched = clientRows.map((c) => ({
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
    disputes: disputesByClient[c.id] || [],
    rounds: roundsByClient[c.id] || [],
    messages: messagesByClient[c.id] || [],
  }));

  return enriched;
}

export function markProcessed(clientId: string, todayIso: string) {
  const client = db.prepare("SELECT round FROM clients WHERE id = ?").get(clientId) as { round: number } | undefined;
  if (!client) return;
  const nextRound = (client.round || 1) + 1;
  const nextDue = new Date(todayIso);
  nextDue.setDate(nextDue.getDate() + 30);
  // Track round history before bump
  insertRound.run({
    id: crypto.randomUUID(),
    clientId,
    round: client.round || 1,
    processedDate: todayIso,
    nextDueDate: nextDue.toISOString().slice(0, 10),
    statusNote: "",
  });
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
    round: row.round ?? null,
    priority: row.priority ?? "Medium",
  });
}

export function updateIssue(row: IssueRecord) {
  db.prepare(
    "UPDATE issues SET issue_type = ?, message_sent = ?, message_date = ?, resolved = ?, note = ?, round = ?, priority = ? WHERE id = ?",
  ).run(row.issueType, row.messageSent ? 1 : 0, row.messageDate, row.resolved ? 1 : 0, row.note ?? "", row.round ?? null, row.priority ?? "Medium", row.id);
}

export function deleteIssue(issueId: string) {
  db.prepare("DELETE FROM issues WHERE id = ?").run(issueId);
}

export function addDoc(row: DocRecord) {
  insertDoc.run({
    ...row,
    messageSent: row.messageSent ? 1 : 0,
    round: row.round ?? null,
    priority: row.priority ?? "Medium",
  });
}

export function updateDoc(row: DocRecord) {
  db.prepare(
    "UPDATE docs SET doc_type = ?, status = ?, message_sent = ?, message_date = ?, note = ?, category = ?, round = ?, priority = ? WHERE id = ?",
  ).run(row.docType, row.status, row.messageSent ? 1 : 0, row.messageDate, row.note ?? "", row.category, row.round ?? null, row.priority ?? "Medium", row.id);
}

export function deleteDoc(docId: string) {
  db.prepare("DELETE FROM docs WHERE id = ?").run(docId);
}

export function addCmIssue(row: CreditMonitoringRecord) {
  insertCm.run({
    ...row,
    messageSent: row.messageSent ? 1 : 0,
    resolved: row.resolved ? 1 : 0,
    round: row.round ?? null,
    priority: row.priority ?? "Medium",
  });
}

export function addDispute(row: DisputeRecord) {
  insertDispute.run(row);
}

export function updateDispute(row: DisputeRecord) {
  insertDispute.run(row);
}

export function deleteDispute(disputeId: string) {
  db.prepare("DELETE FROM disputes WHERE id = ?").run(disputeId);
}

export function addRound(row: RoundHistory) {
  insertRound.run(row);
}

export function addMessage(row: MessageRecord) {
  insertMessage.run(row);
}

export function updateCmIssue(row: CreditMonitoringRecord) {
  db.prepare(
    "UPDATE cm_issues SET platform = ?, issue = ?, message_sent = ?, message_date = ?, resolved = ?, round = ?, priority = ? WHERE id = ?",
  ).run(row.platform, row.issue, row.messageSent ? 1 : 0, row.messageDate, row.resolved ? 1 : 0, row.round ?? null, row.priority ?? "Medium", row.id);
}

export function deleteCmIssue(cmId: string) {
  db.prepare("DELETE FROM cm_issues WHERE id = ?").run(cmId);
}

export function fetchUsers(): User[] {
  const rows = db.prepare("SELECT * FROM users").all() as UserRow[];
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email || "", role: r.role || "Disputer", status: (r.status || "Active") as User["status"] }));
}
