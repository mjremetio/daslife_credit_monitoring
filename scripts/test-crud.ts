import path from 'path';
import fs from 'fs';
process.env.SQLITE_DIR = '/tmp/daslife_test';
process.env.SQLITE_PATH = path.join(process.env.SQLITE_DIR, 'db.sqlite');
if (!fs.existsSync(process.env.SQLITE_DIR)) fs.mkdirSync(process.env.SQLITE_DIR, { recursive: true });

import { ensureSchema, replaceAllData, fetchFullClients, markProcessed, addIssue } from '../src/lib/db.ts';
import { ClientProfile, IssueRecord } from '../src/types/models.ts';

const today = new Date().toISOString().slice(0, 10);

ensureSchema();

const clients: ClientProfile[] = [
  {
    id: 'c1',
    name: 'Test Client',
    onboardDate: today,
    disputer: 'Annabel',
    status: 'Active',
    round: 1,
    dateProcessed: today,
    nextDueDate: today,
    notes: 'seed',
    flags: '',
    isNew: true,
  },
];
const issues: IssueRecord[] = [
  {
    id: 'i1',
    clientId: 'c1',
    issueType: 'Proof of Address',
    messageSent: false,
    messageDate: null,
    resolved: false,
    note: 'missing doc',
  },
];

replaceAllData({ clients, issues, cmIssues: [], docs: [] });

markProcessed('c1', today);

addIssue({
  id: 'i2',
  clientId: 'c1',
  issueType: 'ID',
  messageSent: true,
  messageDate: today,
  resolved: false,
  note: 'sent reminder',
});

const result = fetchFullClients();
console.log(JSON.stringify(result, null, 2));
