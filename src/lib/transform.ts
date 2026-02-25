import { ClientRecord, SheetRow, sheetColumnMap } from "@/types/client";

const toIso = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
};

export const normalizeSheetRow = (row: SheetRow, index: number): ClientRecord => {
  const disputer = String(row[sheetColumnMap.disputer] ?? "").trim();
  const clientName = String(row[sheetColumnMap.clientName] ?? "").trim();
  const roundRaw = row[sheetColumnMap.currentRound];
  const currentRound = roundRaw === "" || roundRaw === null || Number.isNaN(Number(roundRaw))
    ? null
    : Number(roundRaw);

  const dateProcessed = toIso(row[sheetColumnMap.dateProcessed]);
  const nextDueDate = toIso(row[sheetColumnMap.nextDueDate]);
  const notes = String(row[sheetColumnMap.notes] ?? "").trim();
  const issues = String(row[sheetColumnMap.issues] ?? "").trim();

  const idSeed = `${clientName || "row"}-${currentRound ?? "na"}-${index}`;
  const safeId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : encodeURIComponent(idSeed);
  return {
    id: safeId,
    disputer,
    clientName,
    currentRound,
    dateProcessed,
    nextDueDate,
    notes,
    issues,
  };
};

export const normalizeFromAny = (record: Record<string, unknown>, index = 0): ClientRecord => {
  const row = record as SheetRow;
  return normalizeSheetRow(row, index);
};

export const serializeForSheet = (record: ClientRecord): SheetRow => ({
  [sheetColumnMap.disputer]: record.disputer,
  [sheetColumnMap.clientName]: record.clientName,
  [sheetColumnMap.currentRound]: record.currentRound ?? "",
  [sheetColumnMap.dateProcessed]: record.dateProcessed ?? "",
  [sheetColumnMap.nextDueDate]: record.nextDueDate ?? "",
  [sheetColumnMap.notes]: record.notes,
  [sheetColumnMap.issues]: record.issues,
});

export const parseCsvRow = (row: Record<string, string>, index = 0): ClientRecord => {
  return normalizeFromAny(
    {
      [sheetColumnMap.disputer]: row.disputer ?? row.Disputer ?? row.disputerName ?? "",
      [sheetColumnMap.clientName]: row.clientName ?? row["Client Name"] ?? row.Client ?? "",
      [sheetColumnMap.currentRound]: row.currentRound ?? row["Current Round"] ?? "",
      [sheetColumnMap.dateProcessed]:
        row.dateProcessed ?? row["Date Processed"] ?? row["Date Processed (Current Round)"] ?? row["Date Processed\n(Current Round)"] ?? "",
      [sheetColumnMap.nextDueDate]:
        row.nextDueDate ?? row["Next Round Due Date"] ?? row["Next Round \nDue Date \n(+30 days)"] ?? "",
      [sheetColumnMap.notes]: row.notes ?? row.Notes ?? row["Notes/Remarks"] ?? "",
      [sheetColumnMap.issues]: row.issues ?? row["ISSUES?"] ?? row.Issues ?? "",
    },
    index,
  );
};
