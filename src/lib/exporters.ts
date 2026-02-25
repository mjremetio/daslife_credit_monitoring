import Papa from "papaparse";
import * as XLSX from "xlsx";
import { FullClient } from "@/types/models";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const flatRecords = (records: FullClient[]) =>
  records.map((r) => ({
    name: r.name,
    onboardDate: r.onboardDate,
    disputer: r.disputer,
    status: r.status,
    round: r.round,
    dateProcessed: r.dateProcessed,
    nextDueDate: r.nextDueDate,
    notes: r.notes,
    flags: r.flags,
    issuesOpen: r.issues.filter((i) => !i.resolved).length,
    docsPending: r.docs.filter((d) => d.status === "pending" || d.status === "sent").length,
    cmIssuesOpen: r.cmIssues.filter((c) => !c.resolved).length,
  }));

export const exportCsv = (records: FullClient[], filename = "clients.csv") => {
  const csv = Papa.unparse(flatRecords(records));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
};

export const exportXls = (records: FullClient[], filename = "clients.xlsx") => {
  const worksheet = XLSX.utils.json_to_sheet(flatRecords(records));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, filename);
};
