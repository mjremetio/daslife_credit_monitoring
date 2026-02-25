import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ClientProfile, IssueRecord, DocRecord, CreditMonitoringRecord } from "@/types/models";
import crypto from "crypto";

const readFile = (file: File): Promise<ArrayBuffer | string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer | string);
    reader.onerror = reject;
    if (file.name.endsWith(".csv")) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });

const parseDate = (value: string | number | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

export type ImportBundle = {
  clients: ClientProfile[];
  issues: IssueRecord[];
  docs: DocRecord[];
  cmIssues: CreditMonitoringRecord[];
};

type AnyRow = Record<string, string | number | null>;

const defaultClient = (row: AnyRow): ClientProfile => {
  const id = crypto.randomUUID();
  const round = Number(row.round ?? row["Current Round"] ?? 1) || 1;
  const dateProcessed = parseDate(row.dateProcessed ?? row["Date Processed"] ?? row["Date Processed\n(Current Round)"]); 
  const nextDueDate = parseDate(row.nextDueDate ?? row["Next Round Due Date"] ?? row["Next Round \nDue Date \n(+30 days)"]); 
  return {
    id,
    name: String(row.name ?? row["Client Name"] ?? "Unnamed"),
    onboardDate: parseDate(row.onboardDate as string) || dateProcessed,
    disputer: String(row.disputer ?? row["Disputer"] ?? ""),
    status: (row.status || "Active") as ClientProfile["status"],
    round,
    issueFlag: "None",
    dateProcessed,
    nextDueDate,
    notes: String(row.notes ?? row["Notes/Remarks"] ?? ""),
    flags: String(row.flags ?? row["ISSUES?"] ?? ""),
    isNew: round <= 1,
  };
};

export const parseClientFile = async (file: File): Promise<ImportBundle> => {
  let rows: AnyRow[] = [];
  if (file.name.endsWith(".csv")) {
    const text = (await readFile(file)) as string;
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    rows = result.data;
  } else {
    const buffer = (await readFile(file)) as ArrayBuffer;
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as AnyRow[];
  }

  const clients = rows.map(defaultClient);
  return { clients, issues: [], docs: [], cmIssues: [] };
};
