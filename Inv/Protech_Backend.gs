/**
 * ============================================================================
 *  PROTECH DYNAMIC SOLUTIONS  -  Invoice / Quote / Receipts Backend
 * ============================================================================
 *  This is the Google Apps Script "engine" behind the app.
 *  It stores all your data in a Google Sheet and saves your invoice PDFs
 *  and receipt photos into Google Drive, all under your own account.
 *
 *  ----------------------------------------------------------------------------
 *  ONE-TIME SETUP  (about 3 minutes)
 *  ----------------------------------------------------------------------------
 *  1.  Go to  https://script.google.com  and click  New project.
 *  2.  Delete everything in the editor and paste THIS whole file in.
 *  3.  Change the password on the line just below to your own private one.
 *  4.  Click  Deploy  >  New deployment.
 *        - Select type:  Web app
 *        - Description:   Protech Invoices
 *        - Execute as:    Me
 *        - Who has access:  Anyone
 *      Click  Deploy, then  Authorise access  and allow the permissions.
 *  5.  Copy the  Web app URL  (it ends in  /exec ).
 *  6.  Open the Protech app on your phone or laptop. On first open it will
 *      ask for that  Web app URL  and your  password. Enter them once.
 *
 *  That is it. The Sheet and Drive folders are created automatically the
 *  first time the app talks to this script.
 * ============================================================================
 */

// >>>>>>>>>>>>>>>>>>>>  CHANGE THIS TO YOUR OWN PASSWORD  <<<<<<<<<<<<<<<<<<<<<
const APP_PASSWORD = 'change-this-password';
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Names used inside your Google Drive. You can rename these if you like.
const SHEET_NAME      = 'Protech Invoice Data';
const ROOT_FOLDER     = 'Protech Dynamic Solutions';
const INVOICE_FOLDER  = 'Invoices';
const QUOTE_FOLDER    = 'Quotes';
const RECEIPT_FOLDER  = 'Receipts';

const DOC_HEADERS = [
  'id', 'documentType', 'docNo', 'date', 'dueDate', 'terms',
  'clientName', 'clientId', 'clientAddress', 'clientPhone',
  'job', 'items', 'total', 'pdfUrl', 'savedAt'
];

const RECEIPT_HEADERS = [
  'id', 'date', 'supplier', 'category', 'amount', 'vat',
  'paymentMethod', 'notes', 'fileUrl', 'fileName', 'savedAt'
];

/* ----------------------------------------------------------------------------
 *  Web entry points
 * ------------------------------------------------------------------------- */

function doGet(e) {
  // A friendly page so you can confirm in a browser that the script is live.
  return HtmlService.createHtmlOutput(
    '<div style="font-family:system-ui;padding:40px;color:#233140">' +
    '<h2>Protech Dynamic Solutions backend is live.</h2>' +
    '<p>Paste this page\'s URL into the Protech app when it asks for the Apps Script URL.</p>' +
    '</div>'
  );
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');

    if (body.action === 'ping' && body.password === APP_PASSWORD) {
      return json({ ok: true, message: 'Connected' });
    }

    if (body.password !== APP_PASSWORD) {
      return json({ ok: false, error: 'Incorrect password' });
    }

    switch (body.action) {
      case 'ping':          return json({ ok: true, message: 'Connected' });
      case 'list':          return json({ ok: true, documents: listDocuments() });
      case 'save':          return json({ ok: true, document: saveDocument(body.document) });
      case 'delete':        return json({ ok: true, deleted: deleteDocument(body.id) });
      case 'bulkImport':    return json({ ok: true, count: bulkImport(body.documents || []) });
      case 'savePdf':       return json({ ok: true, fileUrl: savePdf(body) });
      case 'listReceipts':  return json({ ok: true, receipts: listReceipts() });
      case 'saveReceipt':   return json({ ok: true, receipt: saveReceipt(body.receipt) });
      case 'deleteReceipt': return json({ ok: true, deleted: deleteReceipt(body.id) });
      default:              return json({ ok: false, error: 'Unknown action: ' + body.action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ----------------------------------------------------------------------------
 *  Spreadsheet helpers
 * ------------------------------------------------------------------------- */

function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* fall through */ }
  }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  props.setProperty('SHEET_ID', ss.getId());
  // move it into the root Drive folder for tidiness
  try {
    const file = DriveApp.getFileById(ss.getId());
    getFolder(ROOT_FOLDER).addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  } catch (e) { /* non-fatal */ }
  return ss;
}

function getSheet(name, headers) {
  const ss = getSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // remove the default empty sheet if present
    const def = ss.getSheetByName('Sheet1');
    if (def && def.getName() !== name) ss.deleteSheet(def);
  }
  return sh;
}

function rowsToObjects(sh, headers) {
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = values[r][c];
    out.push(obj);
  }
  return out;
}

/* ----------------------------------------------------------------------------
 *  Documents (invoices + quotes)
 * ------------------------------------------------------------------------- */

function listDocuments() {
  const sh = getSheet('Documents', DOC_HEADERS);
  return rowsToObjects(sh, DOC_HEADERS).map(function (row) {
    let items = [];
    try { items = JSON.parse(row.items || '[]'); } catch (e) {}
    return {
      id: row.id,
      documentType: row.documentType,
      docNo: String(row.docNo),
      date: row.date,
      dueDate: row.dueDate,
      terms: row.terms,
      client: {
        name: row.clientName, id: row.clientId,
        address: row.clientAddress, phone: String(row.clientPhone)
      },
      job: row.job,
      items: items,
      total: Number(row.total) || 0,
      pdfUrl: row.pdfUrl || ''
    };
  });
}

function docToRow(d) {
  return [
    d.id, d.documentType, String(d.docNo), d.date, d.dueDate || '', d.terms || '',
    d.client.name || '', d.client.id || '', d.client.address || '', String(d.client.phone || ''),
    d.job || '', JSON.stringify(d.items || []), Number(d.total) || 0,
    d.pdfUrl || '', new Date().toISOString()
  ];
}

function saveDocument(d) {
  const sh = getSheet('Documents', DOC_HEADERS);
  const data = sh.getDataRange().getValues();
  // match on docNo + documentType (the natural key of a document)
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][2]) === String(d.docNo) && data[r][1] === d.documentType) {
      // preserve an existing pdfUrl if the new save did not include one
      if (!d.pdfUrl && data[r][13]) d.pdfUrl = data[r][13];
      sh.getRange(r + 1, 1, 1, DOC_HEADERS.length).setValues([docToRow(d)]);
      return d;
    }
  }
  sh.appendRow(docToRow(d));
  return d;
}

function deleteDocument(id) {
  const sh = getSheet('Documents', DOC_HEADERS);
  const data = sh.getDataRange().getValues();
  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][0]) === String(id)) { sh.deleteRow(r + 1); return true; }
  }
  return false;
}

function bulkImport(docs) {
  const sh = getSheet('Documents', DOC_HEADERS);
  const existing = sh.getDataRange().getValues();
  const seen = {};
  for (let r = 1; r < existing.length; r++) seen[existing[r][1] + '|' + existing[r][2]] = true;
  let count = 0;
  const toAppend = [];
  docs.forEach(function (d) {
    const key = d.documentType + '|' + d.docNo;
    if (!seen[key]) { toAppend.push(docToRow(d)); seen[key] = true; count++; }
  });
  if (toAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, DOC_HEADERS.length).setValues(toAppend);
  }
  return count;
}

/* ----------------------------------------------------------------------------
 *  Receipts
 * ------------------------------------------------------------------------- */

function listReceipts() {
  const sh = getSheet('Receipts', RECEIPT_HEADERS);
  return rowsToObjects(sh, RECEIPT_HEADERS).map(function (row) {
    return {
      id: row.id, date: row.date, supplier: row.supplier, category: row.category,
      amount: Number(row.amount) || 0, vat: Number(row.vat) || 0,
      paymentMethod: row.paymentMethod, notes: row.notes,
      fileUrl: row.fileUrl || '', fileName: row.fileName || ''
    };
  });
}

function saveReceipt(rec) {
  const sh = getSheet('Receipts', RECEIPT_HEADERS);
  let fileUrl = rec.fileUrl || '';
  let fileName = rec.fileName || '';

  // If a new file (base64) was attached, save it to the Receipts folder.
  if (rec.fileData) {
    const folder = getFolder(RECEIPT_FOLDER, getFolder(ROOT_FOLDER));
    const bytes = Utilities.base64Decode(rec.fileData);
    const safeSupplier = (rec.supplier || 'receipt').replace(/[^a-zA-Z0-9 ]/g, '').trim();
    fileName = (rec.date || '').replace(/-/g, '') + '_' + safeSupplier + '_' + (rec.fileName || 'receipt');
    const blob = Utilities.newBlob(bytes, rec.mimeType || 'application/octet-stream', fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fileUrl = file.getUrl();
  }

  const row = [
    rec.id, rec.date, rec.supplier || '', rec.category || '',
    Number(rec.amount) || 0, Number(rec.vat) || 0,
    rec.paymentMethod || '', rec.notes || '', fileUrl, fileName, new Date().toISOString()
  ];

  // upsert by id
  const data = sh.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(rec.id)) {
      sh.getRange(r + 1, 1, 1, RECEIPT_HEADERS.length).setValues([row]);
      return objFromReceiptRow(row);
    }
  }
  sh.appendRow(row);
  return objFromReceiptRow(row);
}

function objFromReceiptRow(row) {
  return {
    id: row[0], date: row[1], supplier: row[2], category: row[3],
    amount: row[4], vat: row[5], paymentMethod: row[6], notes: row[7],
    fileUrl: row[8], fileName: row[9]
  };
}

function deleteReceipt(id) {
  const sh = getSheet('Receipts', RECEIPT_HEADERS);
  const data = sh.getDataRange().getValues();
  for (let r = data.length - 1; r >= 1; r--) {
    if (String(data[r][0]) === String(id)) { sh.deleteRow(r + 1); return true; }
  }
  return false;
}

/* ----------------------------------------------------------------------------
 *  Drive: save invoice / quote PDFs
 * ------------------------------------------------------------------------- */

function savePdf(body) {
  const root = getFolder(ROOT_FOLDER);
  const sub = body.type === 'Quote'
    ? getFolder(QUOTE_FOLDER, root)
    : getFolder(INVOICE_FOLDER, root);
  const bytes = Utilities.base64Decode(body.dataBase64);
  const blob = Utilities.newBlob(bytes, 'application/pdf', body.fileName || 'document.pdf');

  // overwrite an existing file with the same name so re-saves do not pile up
  const existing = sub.getFilesByName(body.fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  const file = sub.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/* ----------------------------------------------------------------------------
 *  Drive folder helper
 * ------------------------------------------------------------------------- */

function getFolder(name, parent) {
  const where = parent || DriveApp.getRootFolder();
  const it = where.getFoldersByName(name);
  return it.hasNext() ? it.next() : where.createFolder(name);
}
