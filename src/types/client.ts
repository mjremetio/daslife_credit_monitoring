export type ClientRecord = {
  id: string;
  disputer: string;
  clientName: string;
  currentRound: number | null;
  dateProcessed: string | null; // ISO string YYYY-MM-DD
  nextDueDate: string | null; // ISO string YYYY-MM-DD
  notes: string;
  issues: string;
};

export type SheetSource = "google-sheet" | "sample" | "error";

export const sheetColumnMap = {
  disputer: "Disputer",
  clientName: "Client Name",
  currentRound: "Current Round",
  dateProcessed: "Date Processed\n(Current Round)",
  nextDueDate: "Next Round \nDue Date \n(+30 days)",
  notes: "Notes/Remarks",
  issues: "ISSUES?",
} as const;

export type SheetRow = Record<(typeof sheetColumnMap)[keyof typeof sheetColumnMap], string | number | null>;

export const emptyRecord: ClientRecord = {
  id: "",
  disputer: "",
  clientName: "",
  currentRound: null,
  dateProcessed: null,
  nextDueDate: null,
  notes: "",
  issues: "",
};
