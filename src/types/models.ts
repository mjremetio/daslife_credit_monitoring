export type ClientStatus = "Active" | "On Hold" | "Completed" | "Dropped";

export type ClientProfile = {
  id: string;
  name: string;
  onboardDate: string | null;
  disputer: string;
  status: ClientStatus;
  round: number;
  dateProcessed: string | null;
  nextDueDate: string | null;
  notes: string;
  flags: string;
  isNew: boolean;
};

export type IssueRecord = {
  id: string;
  clientId: string;
  issueType: string;
  messageSent: boolean;
  messageDate: string | null;
  resolved: boolean;
  note: string;
};

export type CreditMonitoringRecord = {
  id: string;
  clientId: string;
  platform: string;
  issue: string;
  messageSent: boolean;
  messageDate: string | null;
  resolved: boolean;
};

export type DocStatus = "pending" | "sent" | "received" | "complete";
export type DocCategory = "completing" | "updating";

export type DocRecord = {
  id: string;
  clientId: string;
  docType: string;
  status: DocStatus;
  messageSent: boolean;
  messageDate: string | null;
  note: string;
  category: DocCategory;
};

export type FullClient = ClientProfile & {
  issues: IssueRecord[];
  docs: DocRecord[];
  cmIssues: CreditMonitoringRecord[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
};
