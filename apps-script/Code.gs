// Apps Script backend for DasLife Credit Monitor
// 1) Create a new Apps Script project linked to a Google Sheet
// 2) Add a Script Property named SHEET_ID (Spreadsheet ID) and API_KEY (shared secret)
// 3) Deploy as a Web App with "Me" as the executing user and "Anyone with the link" access
// 4) Use the deployment URL as GOOGLE_APP_SCRIPT_URL and the same API_KEY in your Vercel env

const SHEET_ID = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
const API_KEY = PropertiesService.getScriptProperties().getProperty("API_KEY");
const HEADERS = [
  "Disputer",
  "Client Name",
  "Current Round",
  "Date Processed\n(Current Round)",
  "Next Round \nDue Date \n(+30 days)",
  "Notes/Remarks",
  "ISSUES?",
];

function doGet(e) {
  if (!isAuthorized(e)) return unauthorized();
  const action = (e.parameter.action || "list").toLowerCase();
  if (action === "ping") return json({ ok: true, sheet: SHEET_ID, ts: new Date().toISOString() });
  return json({ data: readSheet() });
}

function doPost(e) {
  if (!isAuthorized(e)) return unauthorized();
  const action = (e.parameter.action || "bulkupdate").toLowerCase();
  const body = e.postData?.contents ? JSON.parse(e.postData.contents) : {};
  const records = body.records || [];
  if (action === "bulkupdate" || action === "bulk_update") {
    overwriteSheet(records);
    return json({ ok: true, count: records.length });
  }
  return json({ ok: false, message: "Unknown action" });
}

function readSheet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values
    .filter((row) => row.join("").length)
    .map((row) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] ?? "";
      });
      return obj;
    });
}

function overwriteSheet(records) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const headers = records.length ? Object.keys(records[0]) : HEADERS;
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (!records.length) return;
  const rows = records.map((rec) => headers.map((h) => rec[h] ?? ""));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function isAuthorized(e) {
  const key =
    e.parameter.key ||
    (e.postData && e.postData.contents ? JSON.parse(e.postData.contents).key : null);
  return key && key === API_KEY;
}

function unauthorized() {
  return json({ ok: false, reason: "Unauthorized" });
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
