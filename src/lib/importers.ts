import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ClientRecord } from "@/types/client";
import { parseCsvRow } from "./transform";

const readFile = (file: File): Promise<ArrayBuffer | string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer | string);
    reader.onerror = reject;
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });

export const parseClientFile = async (file: File): Promise<ClientRecord[]> => {
  if (file.name.endsWith(".csv")) {
    const text = (await readFile(file)) as string;
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    return result.data.map(parseCsvRow);
  }

  const buffer = (await readFile(file)) as ArrayBuffer;
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  return rows.map(parseCsvRow);
};
