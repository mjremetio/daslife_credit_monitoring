import fs from "fs";
import path from "path";
import sampleData from "@/data/clients.sample.json";
import { ClientProfile, IssueRecord, DocRecord, CreditMonitoringRecord } from "@/types/models";
import { ensureSchema, replaceAllData } from "./db";
import crypto from "crypto";

const toIso = (value: string | number | null): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

export function seedIfEmpty() {
  ensureSchema();
  const dbPath = process.env.SQLITE_PATH || path.join(process.env.SQLITE_DIR || "/tmp/daslife_data", "db.sqlite");
  const stats = fs.statSync(dbPath, { throwIfNoEntry: false });
  if (stats && stats.size > 0) return; // already seeded or has data

  type SampleRow = Record<string, string | number | null>;
  const clients: ClientProfile[] = (sampleData as SampleRow[]).map((row, idx: number) => {
    const id = crypto.randomUUID();
    const round = Number(row["Current Round"]) || 1;
    const processed = toIso(row["Date Processed\n(Current Round)"]); 
    const nextDue = toIso(row["Next Round \nDue Date \n(+30 days)"]); 
    return {
      id,
      name: String(row["Client Name"] || `Client ${idx + 1}`),
      onboardDate: processed,
      disputer: String(row["Disputer"] || ""),
      status: "Active",
      round,
      dateProcessed: processed,
      nextDueDate: nextDue,
      notes: String(row["Notes/Remarks"] || ""),
      flags: String(row["ISSUES?"] || ""),
      isNew: round <= 1,
    };
  });

  const issues: IssueRecord[] = [];
  const docs: DocRecord[] = [];
  const cmIssues: CreditMonitoringRecord[] = [];

  replaceAllData({ clients, issues, docs, cmIssues });
  console.log(`Seeded ${clients.length} clients into sqlite at ${dbPath}`);
}
