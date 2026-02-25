export type ClientStatus = "Active" | "On Hold" | "Completed" | "Dropped";

export type IssueFlag =
  | "None"
  | "IDIQ"
  | "ID"
  | "FTC Code"
  | "Payment"
  | "DO NOT PROCESS"
  | "Completed :)"
  | "Paused"
  | "Proof of Address"
  | "SSC";

export type ClientProfile = {
  id: string;
  name: string;
  onboardDate: string | null;
  disputer: string;
  status: ClientStatus;
  issueFlag: IssueFlag;
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
  round?: number | null;
  priority?: "Low" | "Medium" | "High";
};

export type CreditMonitoringRecord = {
  id: string;
  clientId: string;
  platform: string;
  issue: string;
  messageSent: boolean;
  messageDate: string | null;
  resolved: boolean;
  round?: number | null;
  priority?: "Low" | "Medium" | "High";
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
  round?: number | null;
  priority?: "Low" | "Medium" | "High";
};

export type FullClient = ClientProfile & {
  issues: IssueRecord[];
  docs: DocRecord[];
  cmIssues: CreditMonitoringRecord[];
  disputes?: DisputeRecord[];
  rounds?: RoundHistory[];
  messages?: MessageRecord[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
};

export type DisputeStatus = "Draft" | "Sent" | "Responded" | "Closed";

export type DisputeRecord = {
  id: string;
  clientId: string;
  round: number;
  bureau: "Experian" | "TransUnion" | "Equifax" | string;
  status: DisputeStatus;
  sentDate: string | null;
  dueDate: string | null;
  outcome: string;
  priority: "Low" | "Medium" | "High";
  notes: string;
  blockerFlags: string;
};

export type RoundHistory = {
  id: string;
  clientId: string;
  round: number;
  processedDate: string | null;
  nextDueDate: string | null;
  statusNote: string;
};

export type MessageRecord = {
  id: string;
  clientId: string;
  disputeId?: string | null;
  templateKey: string;
  channel: string;
  sentAt: string;
  contentPreview: string;
};
