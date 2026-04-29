const RESPONSE_SHEET = "Responses";
const AUDIT_SHEET = "Audit";
const SETTINGS_SHEET = "Settings";
const LINKS_SHEET = "Judge Links";
const POSTERS_SHEET = "Poster Assignments";

const RUBRIC = [
  { key: "background", label: "Background Information" },
  { key: "objective", label: "Objective" },
  { key: "methods", label: "Materials and Methods" },
  { key: "findings", label: "Overview of Findings" },
  { key: "conclusions", label: "Conclusions" },
  { key: "relevance", label: "Relevance to Genetic Toxicology" },
  { key: "originality", label: "Originality and Merit" },
  { key: "appearance", label: "Overall Poster Appearance" },
  { key: "presentation", label: "Presenter knowledge and overall presentation" }
];

const POSTERS = [
  ["P28", "Adam Faranda", "Early investigator (<5 years professional experience from terminal degree)", "Validation of a whole-cell in vitro tubulin stability assay in the human-derived Tk6 cell line", "Erica", "James"],
  ["P13", "Alexis Pawlak", "Early investigator (<5 years professional experience from terminal degree)", "Redox-Driven Mechanisms Support NAM Validation for Interpretation of False Positive In Vitro Micronucleus Findings", "Wen", "Erica"],
  ["P22", "Alicia Predom", "Early investigator (<5 years professional experience from terminal degree)", "Multi-Endpoint Genotoxicity Assessment of ENU and MNNG in Four-Week-Old Wistar Han Rats", "Srijit", "Rajib"],
  ["P01", "Gloria Melzi", "Early investigator (<5 years professional experience from terminal degree)", "Integrated in vitro assessment of genotoxic dose-response relationships", "Wen", "Abby"],
  ["P21", "Nisha R. Sweet", "Early investigator (<5 years professional experience from terminal degree)", "Evaluating pChk2 and gH2AX as Potential Biomarkers for DNA Damage by N-Nitroso Compounds (oNNOs)", "Raechel", "Erica"],
  ["P10", "Samuel Odebamowo", "Early investigator (<5 years professional experience from terminal degree)", "Applying a Decision-Support Framework for Efficient and Transparent Carcinogenicity Risk Assessment", "Tetyana", "Srijit"],
  ["P20", "Vivian Tang", "Early investigator (<5 years professional experience from terminal degree)", "Evaluating the mutagenicity of other N-Nitroso (oNNO) compounds using the Ames assay", "James", "Tetyana"],
  ["P11", "Xinwen Zhang", "Early investigator (<5 years professional experience from terminal degree)", "Application of Error-Corrected Sequencing to In Vitro Assessment of Mutagenesis: Proof-of-Concept Experiments with N-Ethyl-Nitrosourea (ENU) and Ethyl Methanesulfonate (EMS) in Human Lymphoblastoid TK6 cells", "Rajib", "Raechel"],
  ["P02", "Caitlin Maggs", "Student", "Investigating DNA damage in multiple cell culture models for the development of quantitative Adverse Outcome Pathways (qAOPs) for genotoxicity", "Stefan", "Abby"],
  ["P07", "Jillian Brejnik", "Student", "Quantum-mechanics calculations elucidate diazonium reactivity of 6-membered cyclic N-nitrosamines to support structure-activity relationships (SARs) for risk assessment", "Raechel", "Tetyana"],
  ["P26", "Alexandria Davis", "Trainees (5 years or less experience in the genetic toxicology field)", "Advancing Non-Animal Genotoxicity Testing: Hen Egg Model Integrating Flow Cytometry and High Content Imaging Analysis", "Wen", "Stefan"],
  ["P15", "Alper James Alcaraz", "Trainees (5 years or less experience in the genetic toxicology field)", "Targeted Cancer-Driver Gene Error-Corrected Sequencing Tracks Broad-Panel Mutagenicity Signals in BbF-Exposed Mice", "Rajib", "Abby"]
];

const JUDGES = [
  { judge: "Abby", posters: ["P01", "P02", "P15"] },
  { judge: "Erica", posters: ["P28", "P13", "P21"] },
  { judge: "James", posters: ["P20", "P28"] },
  { judge: "Raechel", posters: ["P21", "P07", "P11"] },
  { judge: "Rajib", posters: ["P11", "P15", "P22"] },
  { judge: "Stefan", posters: ["P02", "P26"] },
  { judge: "Tetyana", posters: ["P10", "P20", "P07"] },
  { judge: "Wen", posters: ["P13", "P26", "P01"] },
  { judge: "Srijit", posters: ["P10", "P22"] }
];

const RESPONSE_HEADERS = [
  "Key",
  "Last updated",
  "Revision",
  "Judge",
  "Poster #",
  "Presenter",
  "Category",
  "Title",
  "Conflict of interest"
].concat(RUBRIC.map((item) => item.label), ["Total points", "Comments"]);

const AUDIT_HEADERS = [
  "Timestamp",
  "Action",
  "Saved by",
  "Revision",
  "Judge",
  "Poster #",
  "Total points",
  "Conflict of interest",
  "Comments"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("GTA Judging")
    .addItem("Set up judging backend", "setupBackend")
    .addItem("Refresh judge links", "writeJudgeLinks")
    .addToUi();
}

function setupBackend() {
  ensureSecrets_();
  ensureResponseSheets_();
  writeSettings_();
  writePosterAssignments_();
  writeJudgeLinks();
}

function resetTokensForEmergencyOnly() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  setupBackend();
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    const action = p.action || "health";
    if (action === "health") {
      return output_({ ok: true, message: "GTA judging backend is running." }, p.callback);
    }
    if (action === "bootstrap") {
      return output_(bootstrap_(p.token), p.callback);
    }
    if (action === "results") {
      return output_(results_(p.admin), p.callback);
    }
    if (action === "adminWorkspace") {
      return output_(adminWorkspace_(p.admin), p.callback);
    }
    return output_({ ok: false, error: "Unknown action." }, p.callback);
  } catch (err) {
    return output_({ ok: false, error: err.message }, p.callback);
  }
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === "save") {
      return output_(saveSubmission_(p));
    }
    if (p.action === "adminSave") {
      return output_(saveAdminSubmission_(p));
    }
    return output_({ ok: false, error: "Unknown action." });
  } catch (err) {
    return output_({ ok: false, error: err.message });
  }
}

function bootstrap_(token) {
  const tokenMap = getTokenMap_();
  const entry = tokenMap[String(token || "")];
  if (!entry) {
    return { ok: false, error: "Invalid or expired judge link." };
  }

  const submissions = {};
  readSubmissions_()
    .filter((submission) => submission.judge === entry.judge)
    .forEach((submission) => {
      submissions[submission.posterId] = submission;
    });

  return {
    ok: true,
    judge: entry.judge,
    posters: entry.posters.map(findPoster_).filter(Boolean),
    submissions: submissions,
    rubric: RUBRIC
  };
}

function saveSubmission_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return saveSubmissionWithLock_(p);
  } finally {
    lock.releaseLock();
  }
}

function saveSubmissionWithLock_(p) {
  const tokenMap = getTokenMap_();
  const entry = tokenMap[String(p.token || "")];
  if (!entry) {
    return { ok: false, error: "Invalid or expired judge link." };
  }

  const posterId = String(p.posterId || "");
  if (entry.posters.indexOf(posterId) === -1) {
    return { ok: false, error: "This poster is not assigned to this judge." };
  }

  return writeSubmission_(entry.judge, posterId, p, "JUDGE");
}

function saveAdminSubmission_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return saveAdminSubmissionWithLock_(p);
  } finally {
    lock.releaseLock();
  }
}

function saveAdminSubmissionWithLock_(p) {
  const props = PropertiesService.getScriptProperties();
  if (String(p.admin || "") !== props.getProperty("ADMIN_TOKEN")) {
    return { ok: false, error: "Invalid admin link." };
  }

  const judge = String(p.judge || "");
  const entry = JUDGES.filter((item) => item.judge === judge)[0];
  if (!entry) {
    return { ok: false, error: "Unknown judge." };
  }

  const posterId = String(p.posterId || "");
  if (entry.posters.indexOf(posterId) === -1) {
    return { ok: false, error: "This poster is not assigned to the selected judge." };
  }

  return writeSubmission_(entry.judge, posterId, p, "ADMIN");
}

function writeSubmission_(judge, posterId, p, savedBy) {
  const poster = findPoster_(posterId);
  if (!poster) {
    return { ok: false, error: "Poster not found." };
  }

  const conflict = p.conflict === "Yes" ? "Yes" : "No";
  const scores = {};
  let completeCount = 0;
  let total = 0;
  for (let i = 0; i < RUBRIC.length; i++) {
    const item = RUBRIC[i];
    const raw = p[item.key];
    if (raw === "" || raw === null || typeof raw === "undefined") {
      scores[item.key] = "";
      continue;
    }
    const score = Number(raw);
    if (!Number.isInteger(score) || score < 1 || score > 4) {
      return { ok: false, error: "Scores must be integers from 1 to 4." };
    }
    scores[item.key] = score;
    total += score;
    completeCount += 1;
  }

  if (conflict === "No" && completeCount !== RUBRIC.length) {
    return { ok: false, error: "Every rubric item needs a score." };
  }

  const finalTotal = completeCount === RUBRIC.length ? total : "";
  const comments = String(p.comments || "").slice(0, 2000);
  const now = new Date();
  const key = judge + "::" + posterId;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureSheet_(ss, RESPONSE_SHEET, RESPONSE_HEADERS);
  const data = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let r = 1; r < data.length; r++) {
    if (data[r][0] === key) {
      existingRow = r + 1;
      break;
    }
  }

  const revision = existingRow > -1 ? Number(sheet.getRange(existingRow, 3).getValue() || 0) + 1 : 1;
  const row = [
    key,
    now,
    revision,
    judge,
    poster.id,
    poster.presenter,
    poster.category,
    poster.title,
    conflict
  ].concat(RUBRIC.map((item) => scores[item.key]), [finalTotal, comments]);

  if (existingRow > -1) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  const audit = ensureSheet_(ss, AUDIT_SHEET, AUDIT_HEADERS);
  audit.appendRow([
    now,
    existingRow > -1 ? "UPDATE" : "CREATE",
    savedBy,
    revision,
    judge,
    poster.id,
    finalTotal,
    conflict,
    comments
  ]);

  return { ok: true, revision: revision };
}

function adminWorkspace_(adminToken) {
  const props = PropertiesService.getScriptProperties();
  if (String(adminToken || "") !== props.getProperty("ADMIN_TOKEN")) {
    return { ok: false, error: "Invalid admin link." };
  }

  return {
    ok: true,
    judges: JUDGES.map((entry) => ({
      judge: entry.judge,
      posters: entry.posters.map(findPoster_).filter(Boolean)
    })).sort((a, b) => a.judge.localeCompare(b.judge)),
    submissions: readSubmissions_()
  };
}

function results_(adminToken) {
  const props = PropertiesService.getScriptProperties();
  if (String(adminToken || "") !== props.getProperty("ADMIN_TOKEN")) {
    return { ok: false, error: "Invalid admin link." };
  }

  const submissions = readSubmissions_();
  const posterResults = POSTERS.map((row) => {
    const poster = posterFromRow_(row);
    const posterSubmissions = submissions.filter((submission) => submission.posterId === poster.id);
    const included = posterSubmissions.filter((submission) => submission.conflict !== "Yes" && submission.total !== "");
    const average = included.length
      ? included.reduce((sum, submission) => sum + Number(submission.total), 0) / included.length
      : "";
    return Object.assign({}, poster, {
      average: average === "" ? "" : Math.round(average * 10) / 10,
      includedCount: included.length,
      responseCount: posterSubmissions.length,
      expectedCount: poster.judges.length,
      rank: ""
    });
  }).sort((a, b) => {
    if (a.average === "" && b.average === "") return a.id.localeCompare(b.id);
    if (a.average === "") return 1;
    if (b.average === "") return -1;
    return b.average - a.average;
  });

  let previousAverage = null;
  let previousRank = 0;
  posterResults.forEach((poster, index) => {
    if (poster.average === "") return;
    if (poster.average === previousAverage) {
      poster.rank = previousRank;
    } else {
      poster.rank = index + 1;
      previousRank = poster.rank;
      previousAverage = poster.average;
    }
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    winner: posterResults.filter((poster) => poster.average !== "")[0] || null,
    posters: posterResults,
    submissions: submissions
  };
}

function ensureResponseSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, RESPONSE_SHEET, RESPONSE_HEADERS);
  ensureSheet_(ss, AUDIT_SHEET, AUDIT_HEADERS);
}

function writeSettings_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  const sheet = ss.getSheetByName(SETTINGS_SHEET) || ss.insertSheet(SETTINGS_SHEET);
  const existingWebsiteUrl = sheet.getLastRow() >= 2 ? sheet.getRange(2, 2).getValue() : "";
  const existingScriptUrl = sheet.getLastRow() >= 3 ? sheet.getRange(3, 2).getValue() : "";
  sheet.clear();
  sheet.getRange(1, 1, 7, 2).setValues([
    ["Setting", "Value"],
    ["Website URL", existingWebsiteUrl || ""],
    ["Apps Script Web App URL", existingScriptUrl || ""],
    ["Admin token", props.getProperty("ADMIN_TOKEN")],
    ["Admin results link", '=IF(B2="","Paste website URL in B2",B2&"?admin="&B4)'],
    ["Backend health URL", '=IF(B3="","Paste Apps Script /exec URL in B3",B3&"?action=health")'],
    ["Note", "Do not share this spreadsheet with judges."]
  ]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);
}

function writePosterAssignments_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(POSTERS_SHEET) || ss.insertSheet(POSTERS_SHEET);
  sheet.clear();
  sheet.getRange(1, 1, 1, 6).setValues([["Poster #", "Presenter", "Category", "Title", "Judge 1", "Judge 2"]]);
  sheet.getRange(2, 1, POSTERS.length, 6).setValues(POSTERS);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 6);
}

function writeJudgeLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSecrets_();
  const tokenMap = getTokenMap_();
  const sheet = ss.getSheetByName(LINKS_SHEET) || ss.insertSheet(LINKS_SHEET);
  const rows = Object.keys(tokenMap)
    .map((token) => [tokenMap[token].judge, tokenMap[token].posters.join(", "), token, ""])
    .sort((a, b) => a[0].localeCompare(b[0]));

  sheet.clear();
  sheet.getRange(1, 1, 1, 4).setValues([["Judge", "Assigned posters", "Token", "Personalized link"]]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    for (let i = 0; i < rows.length; i++) {
      sheet.getRange(i + 2, 4).setFormula(`=IF(Settings!$B$2="","Paste website URL in Settings!B2",Settings!$B$2&"?token="&C${i + 2})`);
    }
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 4);
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = current.join("") === "" || current.join("\u0001") !== headers.join("\u0001");
  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureSecrets_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("ADMIN_TOKEN")) {
    props.setProperty("ADMIN_TOKEN", makeToken_());
  }

  const existingRaw = props.getProperty("JUDGE_TOKENS");
  const existingMap = existingRaw ? JSON.parse(existingRaw) : {};
  const tokenByJudge = {};
  Object.keys(existingMap).forEach((token) => {
    tokenByJudge[existingMap[token].judge] = token;
  });

  const nextMap = {};
  JUDGES.forEach((entry) => {
    const token = tokenByJudge[entry.judge] || makeToken_();
    nextMap[token] = {
      judge: entry.judge,
      posters: entry.posters
    };
  });
  props.setProperty("JUDGE_TOKENS", JSON.stringify(nextMap));
}

function getTokenMap_() {
  const raw = PropertiesService.getScriptProperties().getProperty("JUDGE_TOKENS");
  if (!raw) {
    throw new Error("Run setupBackend in Apps Script before using the judging site.");
  }
  return JSON.parse(raw);
}

function readSubmissions_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureSheet_(ss, RESPONSE_SHEET, RESPONSE_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter((row) => row[0])
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      const scores = {};
      RUBRIC.forEach((item) => {
        const value = record[item.label];
        scores[item.key] = value === "" ? "" : Number(value);
      });
      return {
        updatedAt: record["Last updated"] instanceof Date ? record["Last updated"].toISOString() : record["Last updated"],
        revision: Number(record["Revision"] || 1),
        judge: record["Judge"],
        posterId: record["Poster #"],
        presenter: record["Presenter"],
        category: record["Category"],
        title: record["Title"],
        conflict: record["Conflict of interest"] || "No",
        scores: scores,
        total: record["Total points"] === "" ? "" : Number(record["Total points"]),
        comments: record["Comments"] || ""
      };
    });
}

function findPoster_(posterId) {
  const row = POSTERS.filter((poster) => poster[0] === posterId)[0];
  return row ? posterFromRow_(row) : null;
}

function posterFromRow_(row) {
  return {
    id: row[0],
    presenter: row[1],
    category: row[2],
    title: row[3],
    judges: [row[4], row[5]]
  };
}

function makeToken_() {
  return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "").slice(0, 8);
}

function output_(data, callback) {
  const text = JSON.stringify(data);
  if (callback) {
    const safeCallback = String(callback).replace(/[^\w.$]/g, "");
    return ContentService
      .createTextOutput(`${safeCallback}(${text});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.JSON);
}
