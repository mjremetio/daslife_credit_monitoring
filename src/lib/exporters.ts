import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ClientRecord } from "@/types/client";
import { serializeForSheet } from "./transform";

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

export const exportCsv = (records: ClientRecord[], filename = "clients.csv") => {
  const data = records.map(serializeForSheet);
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
};

export const exportXls = (records: ClientRecord[], filename = "clients.xlsx") => {
  const worksheet = XLSX.utils.json_to_sheet(records.map(serializeForSheet));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, filename);
};
