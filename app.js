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

const SCORE_MAX = RUBRIC.length * 4;
const JSONP_MAX_ATTEMPTS = 3;
const JSONP_TIMEOUT_MS = 20000;

const POSTERS = [
  {
    id: "P28",
    presenter: "Adam Faranda",
    category: "Early investigator (<5 years professional experience from terminal degree)",
    title: "Validation of a whole-cell in vitro tubulin stability assay in the human-derived Tk6 cell line",
    judges: ["Erica", "James"]
  },
  {
    id: "P13",
    presenter: "Alexis Pawlak",
    category: "Early investigator (<5 years professional experience from terminal degree)",
    title: "Redox-Driven Mechanisms Support NAM Validation for Interpretation of False Positive In Vitro Micronucleus Findings",
    judges: ["Wen", "Erica"]
  },
  {
    id: "P22",
    presenter: "Alicia Predom",
    category: "Early investigator (<5 years professional experience from terminal degree)",
    title: "Multi-Endpoint Genotoxicity Assessment of ENU and MNNG in Four-Week-Old Wistar Han Rats",
    judges: ["Srijit", "Rajib"]
  },
  {
    id: "P01",
    presenter: "Gloria Melzi",
    category: "Early investigator (<5 years professional experience from terminal degree)",
    title: "Integrated in vitro assessment of genotoxic dose-response relationships",
    judges: ["Wen", "Abby"]
  },
  {
    id: "P21",
    presenter: "Nisha R. Sweet",
    category: "Early investigator (<5 years professional experience from terminal degree)",
    title: "Evaluating pChk2 and gH2AX as Potential Biomarkers for DNA Damage by N-Nitroso Compounds (oNNOs)",
    judges: ["Raechel", "Erica"]
  },
  {
    id: "P10",
    presenter: "Samuel Odebamowo",
    category: "Early investigator (<5 years professional experience from terminal degree)",
    title: "Applying a Decision-Support Framework for Efficient and Transparent Carcinogenicity Risk Assessment",
    judges: ["Tetyana", "Srijit"]
  },
  {
    id: "P20",
    presenter: "Vivian Tang",
    category: "Early investigator (<5 years professional experience from terminal degree)",
    title: "Evaluating the mutagenicity of other N-Nitroso (oNNO) compounds using the Ames assay",
    judges: ["James", "Tetyana"]
  },
  {
    id: "P11",
    presenter: "Xinwen Zhang",
    category: "Early investigator (<5 years professional experience from terminal degree)",
    title: "Application of Error-Corrected Sequencing to In Vitro Assessment of Mutagenesis: Proof-of-Concept Experiments with N-Ethyl-Nitrosourea (ENU) and Ethyl Methanesulfonate (EMS) in Human Lymphoblastoid TK6 cells",
    judges: ["Rajib", "Raechel"]
  },
  {
    id: "P02",
    presenter: "Caitlin Maggs",
    category: "Student",
    title: "Investigating DNA damage in multiple cell culture models for the development of quantitative Adverse Outcome Pathways (qAOPs) for genotoxicity",
    judges: ["Stefan", "Abby"]
  },
  {
    id: "P07",
    presenter: "Jillian Brejnik",
    category: "Student",
    title: "Quantum-mechanics calculations elucidate diazonium reactivity of 6-membered cyclic N-nitrosamines to support structure-activity relationships (SARs) for risk assessment",
    judges: ["Raechel", "Tetyana"]
  },
  {
    id: "P26",
    presenter: "Alexandria Davis",
    category: "Trainees (5 years or less experience in the genetic toxicology field)",
    title: "Advancing Non-Animal Genotoxicity Testing: Hen Egg Model Integrating Flow Cytometry and High Content Imaging Analysis",
    judges: ["Wen", "Stefan"]
  },
  {
    id: "P15",
    presenter: "Alper James Alcaraz",
    category: "Trainees (5 years or less experience in the genetic toxicology field)",
    title: "Targeted Cancer-Driver Gene Error-Corrected Sequencing Tracks Broad-Panel Mutagenicity Signals in BbF-Exposed Mice",
    judges: ["Rajib", "Abby"]
  }
];

const SCORE_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Excellent"
};

const config = window.GTA_CONFIG || {};
const params = new URLSearchParams(window.location.search);

const state = {
  token: params.get("token") || "",
  adminToken: params.get("admin") || "",
  activeView: params.get("admin") ? "results" : "judge",
  judgeData: null,
  adminWorkspace: null,
  selectedAdminJudge: "",
  resultsData: null,
  selectedPosterId: "",
  selectedResultPosterId: "",
  saving: false,
  resultsTimer: null
};

const els = {
  modeBadge: document.getElementById("modeBadge"),
  statusPanel: document.getElementById("statusPanel"),
  judgeName: document.getElementById("judgeName"),
  judgeProgress: document.getElementById("judgeProgress"),
  adminJudgeTools: document.getElementById("adminJudgeTools"),
  posterList: document.getElementById("posterList"),
  scorePanel: document.getElementById("scorePanel"),
  resultsContent: document.getElementById("resultsContent"),
  refreshResultsBtn: document.getElementById("refreshResultsBtn"),
  downloadResultsBtn: document.getElementById("downloadResultsBtn")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindTabs();
  els.refreshResultsBtn.addEventListener("click", loadResults);
  els.downloadResultsBtn.addEventListener("click", downloadResultsCsv);
  switchView(state.activeView);

  if (state.adminToken) {
    loadResults();
    return;
  }

  if (state.token) {
    loadJudge();
    return;
  }

  renderStartState();
}

function bindTabs() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
}

function switchView(view) {
  state.activeView = view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `${view}View`);
  });

  if (view === "results" && state.adminToken && !state.resultsData) {
    loadResults();
  }
  if (view === "results" && !state.adminToken) {
    renderLockedResults();
  }
  if (view === "judge" && state.adminToken && !state.judgeData) {
    loadAdminWorkspace();
  }
  manageResultsRefresh();
}

function manageResultsRefresh() {
  if (state.resultsTimer) {
    window.clearInterval(state.resultsTimer);
    state.resultsTimer = null;
  }
  if (state.activeView === "results" && state.adminToken) {
    state.resultsTimer = window.setInterval(loadResults, 60000);
  }
}

async function loadJudge() {
  showStatus("Loading judge workspace...", "info");
  setMode("Judge link");

  try {
    const data = await apiBootstrap(state.token);
    if (!data.ok) {
      throw new Error(data.error || "Could not load judge link.");
    }
    state.judgeData = data;
    const firstOpen = data.posters.find((poster) => !data.submissions[poster.id]);
    state.selectedPosterId = (firstOpen || data.posters[0] || {}).id || "";
    renderJudgeWorkspace();
    showStatus(`Loaded ${data.judge}'s assigned posters. Saved ratings can be reopened and updated.`, "success");
  } catch (error) {
    renderLoadError(error.message);
  }
}

async function loadResults() {
  if (!state.adminToken) {
    renderLockedResults();
    return;
  }

  setMode("Admin results");
  els.resultsContent.innerHTML = `<div class="loading-row">Loading live results...</div>`;

  try {
    const data = await apiResults(state.adminToken);
    if (!data.ok) {
      throw new Error(data.error || "Could not load results.");
    }
    state.resultsData = data;
    state.selectedResultPosterId = state.selectedResultPosterId || (data.posters[0] || {}).id || "";
    renderResults();
    showStatus(`Results refreshed ${formatTime(data.generatedAt)}.`, "success");
  } catch (error) {
    els.resultsContent.innerHTML = `<div class="empty-state"><h2>Results unavailable</h2><p>${escapeHtml(error.message)}</p></div>`;
    showStatus(error.message, "error");
  }
}

async function loadAdminWorkspace() {
  if (!state.adminToken) return;
  showStatus("Loading admin access to judge workspaces...", "info");
  setMode("Admin judge access");

  try {
    const data = await apiAdminWorkspace(state.adminToken);
    if (!data.ok) {
      throw new Error(data.error || "Could not load judge workspaces.");
    }
    state.adminWorkspace = data;
    state.selectedAdminJudge = state.selectedAdminJudge || (data.judges[0] || {}).judge || "";
    setAdminJudgeData(state.selectedAdminJudge);
    showStatus("Admin access loaded. Choose any judge to view or update assigned ratings.", "success");
  } catch (error) {
    renderLoadError(error.message);
  }
}

function setAdminJudgeData(judgeName) {
  const entry = state.adminWorkspace.judges.find((judge) => judge.judge === judgeName);
  if (!entry) return;
  state.selectedAdminJudge = judgeName;
  const submissions = {};
  state.adminWorkspace.submissions
    .filter((submission) => submission.judge === judgeName)
    .forEach((submission) => {
      submissions[submission.posterId] = submission;
    });
  state.judgeData = {
    ok: true,
    adminAccess: true,
    judge: entry.judge,
    posters: entry.posters,
    submissions,
    rubric: RUBRIC
  };
  const firstOpen = entry.posters.find((poster) => !submissions[poster.id]);
  state.selectedPosterId = (firstOpen || entry.posters[0] || {}).id || "";
  renderJudgeWorkspace();
}

function renderStartState() {
  setMode("Setup needed");
  showStatus(`
    <strong>Open a judge or admin link to begin.</strong>
    <span>After deploying Apps Script, paste its /exec URL into <code>config.js</code>. The production links are generated in the Google Sheet after setup.</span>
  `, "info", true);
}

function renderLoadError(message) {
  setMode("Link error");
  els.judgeName.textContent = "Could not load";
  els.judgeProgress.textContent = "Check the token and Apps Script deployment.";
  els.adminJudgeTools.innerHTML = "";
  els.posterList.innerHTML = "";
  els.scorePanel.innerHTML = `
    <div class="empty-state">
      <h2>Judge link unavailable</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  showStatus(message, "error");
}

function renderJudgeWorkspace() {
  const { judge, posters, submissions } = state.judgeData;
  const savedCount = posters.filter((poster) => submissions[poster.id]).length;
  els.judgeName.textContent = state.judgeData.adminAccess ? `Admin: ${judge}` : judge;
  els.judgeProgress.textContent = `${savedCount} of ${posters.length} posters scored`;
  renderAdminJudgeTools();
  renderPosterList();
  renderScoreForm();
}

function renderAdminJudgeTools() {
  if (!state.judgeData || !state.judgeData.adminAccess || !state.adminWorkspace) {
    els.adminJudgeTools.innerHTML = "";
    return;
  }

  els.adminJudgeTools.innerHTML = `
    <label>
      <span>Judge workspace</span>
      <select id="adminJudgeSelect">
        ${state.adminWorkspace.judges.map((entry) => `
          <option value="${escapeHtml(entry.judge)}" ${entry.judge === state.selectedAdminJudge ? "selected" : ""}>${escapeHtml(entry.judge)}</option>
        `).join("")}
      </select>
    </label>
    <p>Scores saved here are written as the selected judge and marked in the audit log as admin-entered.</p>
  `;

  document.getElementById("adminJudgeSelect").addEventListener("change", (event) => {
    setAdminJudgeData(event.target.value);
  });
}

function renderPosterList() {
  const { posters, submissions } = state.judgeData;
  els.posterList.innerHTML = posters.map((poster) => {
    const submission = submissions[poster.id];
    const status = submission ? "Saved" : "Not scored";
    const total = submission && submission.total !== "" ? `${submission.total}/${SCORE_MAX}` : "";
    return `
      <button type="button" class="poster-item ${poster.id === state.selectedPosterId ? "is-selected" : ""}" data-poster-id="${poster.id}">
        <span class="poster-id">${escapeHtml(poster.id)}</span>
        <span class="poster-title">${escapeHtml(poster.presenter)}</span>
        <span class="poster-meta">${escapeHtml(shortCategory(poster.category))}</span>
        <span class="poster-subtitle">${escapeHtml(poster.title)}</span>
        <span class="poster-status ${submission ? "is-saved" : ""}">${status}${total ? ` - ${total}` : ""}</span>
      </button>
    `;
  }).join("");

  els.posterList.querySelectorAll("[data-poster-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPosterId = button.dataset.posterId;
      renderJudgeWorkspace();
    });
  });
}

function renderScoreForm() {
  const { posters, submissions } = state.judgeData;
  const poster = posters.find((item) => item.id === state.selectedPosterId);
  if (!poster) {
    els.scorePanel.innerHTML = `<div class="empty-state"><h2>No assigned posters</h2><p>This judge link has no posters assigned.</p></div>`;
    return;
  }

  const existing = submissions[poster.id] || { scores: {}, comments: "", conflict: "No" };
  const scoreTotal = totalScore(existing.scores);
  const savedLabel = existing.updatedAt
    ? `Saved ${formatTime(existing.updatedAt)} - revision ${existing.revision || 1}. Submitting again updates this rating.`
    : "Not yet submitted. You can return to this link later and update the rating.";
  const conflictChecked = existing.conflict === "Yes" ? "checked" : "";
  const displayedTotal = existing.conflict === "Yes" ? "EX" : (scoreTotal.complete ? scoreTotal.total : "--");

  els.scorePanel.innerHTML = `
    <div class="poster-summary">
      <div>
        <p class="eyebrow">${escapeHtml(poster.id)} - ${escapeHtml(shortCategory(poster.category))}</p>
        <h2>${escapeHtml(poster.presenter)}</h2>
        <p>${escapeHtml(poster.title)}</p>
      </div>
      <div class="total-meter">
        <span id="totalScore">${displayedTotal}</span>
        <small>of ${SCORE_MAX}</small>
      </div>
    </div>

    <div class="save-note">
      <strong>${existing.updatedAt ? "Edit mode" : "New rating"}</strong>
      <span>${escapeHtml(savedLabel)}</span>
    </div>

    <label class="conflict-toggle">
      <input type="checkbox" id="conflictInput" ${conflictChecked}>
      <span>I have a conflict of interest for this poster</span>
    </label>

    <form id="scoreForm" class="score-form">
      ${RUBRIC.map((criterion, index) => renderCriterion(criterion, existing.scores[criterion.key], index)).join("")}
      <label class="comments-field">
        <span>Comments</span>
        <textarea id="commentsInput" rows="4" maxlength="2000" placeholder="Optional notes for the judging committee">${escapeHtml(existing.comments || "")}</textarea>
      </label>
      <div class="form-actions">
        <button class="primary-btn" type="submit">${existing.updatedAt ? "Update rating" : "Save rating"}</button>
        ${state.judgeData.adminAccess ? `<span class="admin-save-badge">Saving as ${escapeHtml(state.judgeData.judge)}</span>` : ""}
        <span id="saveState" class="save-state"></span>
      </div>
    </form>
  `;

  els.scorePanel.querySelectorAll(".score-choice").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".criterion-row");
      row.querySelectorAll(".score-choice").forEach((choice) => {
        choice.classList.remove("is-selected");
        choice.setAttribute("aria-pressed", "false");
      });
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
      updateVisibleTotal();
    });
  });

  document.getElementById("conflictInput").addEventListener("change", updateVisibleTotal);
  document.getElementById("scoreForm").addEventListener("submit", saveRating);
}

function renderCriterion(criterion, selectedScore, index) {
  return `
    <fieldset class="criterion-row" data-key="${criterion.key}">
      <legend>
        <span>${index + 1}</span>
        ${escapeHtml(criterion.label)}
      </legend>
      <div class="score-options" role="radiogroup" aria-label="${escapeHtml(criterion.label)}">
        ${[1, 2, 3, 4].map((score) => `
          <button class="score-choice ${Number(selectedScore) === score ? "is-selected" : ""}" type="button" data-score="${score}" aria-pressed="${Number(selectedScore) === score}">
            <strong>${score}</strong>
            <span>${SCORE_LABELS[score]}</span>
          </button>
        `).join("")}
      </div>
    </fieldset>
  `;
}

async function saveRating(event) {
  event.preventDefault();
  if (state.saving) return;

  const poster = state.judgeData.posters.find((item) => item.id === state.selectedPosterId);
  const saveState = document.getElementById("saveState");
  const conflict = document.getElementById("conflictInput").checked ? "Yes" : "No";
  const scores = collectScores();

  if (conflict === "No" && !scores.complete) {
    saveState.textContent = "Select a score for every rubric item.";
    saveState.className = "save-state is-error";
    return;
  }

  const payload = {
    action: "save",
    token: state.token,
    admin: state.adminToken,
    judge: state.judgeData.judge,
    adminAccess: state.judgeData.adminAccess ? "Yes" : "No",
    posterId: poster.id,
    conflict,
    comments: document.getElementById("commentsInput").value.trim()
  };
  RUBRIC.forEach((criterion) => {
    payload[criterion.key] = scores.values[criterion.key] || "";
  });

  state.saving = true;
  saveState.textContent = "Saving...";
  saveState.className = "save-state";

  try {
    await apiSave(payload);
    if (state.judgeData.adminAccess) {
      const savedPosterId = poster.id;
      await loadAdminWorkspace();
      state.selectedPosterId = savedPosterId;
      renderJudgeWorkspace();
    } else {
      await loadJudge();
    }
    showStatus(`${poster.id} was saved. Reopen it anytime from this link to edit the rating.`, "success");
  } catch (error) {
    saveState.textContent = error.message;
    saveState.className = "save-state is-error";
    showStatus(error.message, "error");
  } finally {
    state.saving = false;
  }
}

function collectScores() {
  const values = {};
  let complete = true;
  document.querySelectorAll(".criterion-row").forEach((row) => {
    const selected = row.querySelector(".score-choice.is-selected");
    if (!selected) {
      complete = false;
      values[row.dataset.key] = "";
      return;
    }
    values[row.dataset.key] = Number(selected.dataset.score);
  });
  return { values, complete };
}

function updateVisibleTotal() {
  const totalEl = document.getElementById("totalScore");
  if (!totalEl) return;
  const conflict = document.getElementById("conflictInput").checked;
  if (conflict) {
    totalEl.textContent = "EX";
    return;
  }
  const scores = collectScores();
  totalEl.textContent = scores.complete ? totalScore(scores.values).total : "--";
}

function renderLockedResults() {
  els.resultsContent.innerHTML = `
    <div class="empty-state">
      <h2>Admin link required</h2>
      <p>Open the admin results link generated by the Apps Script setup sheet.</p>
    </div>
  `;
}

function renderResults() {
  const data = state.resultsData;
  if (!data.posters.length) {
    els.resultsContent.innerHTML = `<div class="empty-state"><h2>No results yet</h2><p>Scores will appear here as judges submit ratings.</p></div>`;
    return;
  }

  const winner = data.winner;
  const summary = summarizeResults(data);
  const judgeRows = buildJudgeCompletion(data);
  const assignmentIssues = findAssignmentMismatches(data);
  const ignoredSubmissionCount = Number(data.ignoredSubmissionCount || 0);
  const selected = data.posters.find((poster) => poster.id === state.selectedResultPosterId) || data.posters[0];
  state.selectedResultPosterId = selected.id;

  els.resultsContent.innerHTML = `
    ${assignmentIssues.length ? renderAssignmentWarning(assignmentIssues) : ""}
    ${ignoredSubmissionCount ? `
      <section class="backend-warning is-info">
        <strong>Stale saved ratings ignored</strong>
        <span>${ignoredSubmissionCount} response${ignoredSubmissionCount === 1 ? "" : "s"} no longer match the current judge assignments and are excluded from these results.</span>
      </section>
    ` : ""}

    <section class="summary-cards" aria-label="Results summary">
      <div class="summary-card">
        <span>${summary.includedSubmissions}</span>
        <strong>Included scores</strong>
        <small>${summary.totalSubmissions} total submissions</small>
      </div>
      <div class="summary-card">
        <span>${summary.completePosters}</span>
        <strong>Complete posters</strong>
        <small>${summary.expectedPosters} posters assigned</small>
      </div>
      <div class="summary-card">
        <span>${summary.missingSubmissions}</span>
        <strong>Missing ratings</strong>
        <small>based on judge assignments</small>
      </div>
      <div class="summary-card">
        <span>${summary.conflicts}</span>
        <strong>Conflicts</strong>
        <small>excluded from averages</small>
      </div>
    </section>

    <section class="winner-strip">
      <div>
        <p class="eyebrow">Current leader</p>
        <h3>${winner ? `${escapeHtml(winner.id)} - ${escapeHtml(winner.presenter)}` : "No submitted scores yet"}</h3>
        <p>${winner ? escapeHtml(winner.title) : "The leaderboard will update as complete ratings come in."}</p>
      </div>
      <div class="winner-score">
        <span>${winner && winner.average !== "" ? winner.average.toFixed(1) : "--"}</span>
        <small>average / ${SCORE_MAX}</small>
      </div>
    </section>

    <div class="results-grid">
      <section class="ranking-table-wrap">
        <table class="ranking-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Poster</th>
              <th>Presenter</th>
              <th>Category</th>
              <th>Avg</th>
              <th>Scores</th>
              <th>Missing</th>
            </tr>
          </thead>
          <tbody>
            ${data.posters.map((poster) => `
              <tr class="${poster.id === selected.id ? "is-selected" : ""}" data-result-poster="${poster.id}">
                <td>${poster.rank || ""}</td>
                <td>${escapeHtml(poster.id)}</td>
                <td>${escapeHtml(poster.presenter)}</td>
                <td>${escapeHtml(shortCategory(poster.category))}</td>
                <td>${poster.average !== "" ? poster.average.toFixed(1) : "--"}</td>
                <td>${poster.includedCount}/${poster.expectedCount}</td>
                <td>${escapeHtml(missingJudgesForPoster(data, poster).join(", ") || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
      <section class="result-detail" id="resultDetail"></section>
    </div>

    <section class="judge-completion">
      <div class="section-heading">
        <p class="eyebrow">Judge completion</p>
        <h3>Assigned ratings</h3>
      </div>
      <table class="completion-table">
        <thead>
          <tr>
            <th>Judge</th>
            <th>Submitted</th>
            <th>Missing</th>
            <th>Assigned posters</th>
          </tr>
        </thead>
        <tbody>
          ${judgeRows.map((row) => `
            <tr>
              <td>${escapeHtml(row.judge)}</td>
              <td>${row.submitted}/${row.assigned.length}</td>
              <td>${escapeHtml(row.missing.join(", ") || "-")}</td>
              <td>${escapeHtml(row.assigned.join(", "))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;

  els.resultsContent.querySelectorAll("[data-result-poster]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedResultPosterId = row.dataset.resultPoster;
      renderResults();
    });
  });
  renderResultDetail(selected);
}

function renderResultDetail(poster) {
  const detail = document.getElementById("resultDetail");
  const submissions = state.resultsData.submissions.filter((submission) => submission.posterId === poster.id);
  const missing = missingJudgesForPoster(state.resultsData, poster);

  detail.innerHTML = `
    <div class="detail-heading">
      <p class="eyebrow">${escapeHtml(poster.id)}</p>
      <h3>${escapeHtml(poster.presenter)}</h3>
      <p>${escapeHtml(poster.title)}</p>
      <div class="judge-chip-row">
        ${poster.judges.map((judge) => `<span>${escapeHtml(judge)}</span>`).join("")}
      </div>
    </div>
    <div class="metric-row">
      <div><strong>${poster.average !== "" ? poster.average.toFixed(1) : "--"}</strong><span>Average</span></div>
      <div><strong>${poster.includedCount}</strong><span>Included</span></div>
      <div><strong>${poster.expectedCount}</strong><span>Assigned</span></div>
    </div>
    ${missing.length ? `<div class="missing-note"><strong>Missing:</strong> ${escapeHtml(missing.join(", "))}</div>` : ""}
    <div class="submission-list">
      ${submissions.length ? submissions.map(renderSubmissionDetail).join("") : `<p class="muted">No submissions yet.</p>`}
    </div>
  `;
}

function renderSubmissionDetail(submission) {
  return `
    <article class="submission-detail">
      <div class="submission-topline">
        <strong>${escapeHtml(submission.judge)}</strong>
        <span>${submission.conflict === "Yes" ? "Conflict - excluded" : `${submission.total}/${SCORE_MAX}`}</span>
      </div>
      <dl class="criteria-mini">
        ${RUBRIC.map((criterion) => `
          <div>
            <dt>${escapeHtml(criterion.label)}</dt>
            <dd>${submission.scores[criterion.key] || "-"}</dd>
          </div>
        `).join("")}
      </dl>
      ${submission.comments ? `<p class="comment-text">${escapeHtml(submission.comments)}</p>` : ""}
    </article>
  `;
}

function summarizeResults(data) {
  const expectedRatings = data.posters.reduce((sum, poster) => sum + poster.expectedCount, 0);
  const includedSubmissions = data.submissions.filter((submission) => submission.conflict !== "Yes" && submission.total !== "").length;
  const conflicts = data.submissions.filter((submission) => submission.conflict === "Yes").length;
  return {
    includedSubmissions,
    totalSubmissions: data.submissions.length,
    conflicts,
    expectedPosters: data.posters.length,
    completePosters: data.posters.filter((poster) => poster.includedCount >= poster.expectedCount).length,
    missingSubmissions: Math.max(0, expectedRatings - includedSubmissions)
  };
}

function renderAssignmentWarning(issues) {
  return `
    <section class="backend-warning">
      <strong>Apps Script assignment data is stale</strong>
      <span>The website is current, but the backend results are returning older judge assignments. Paste the latest <code>apps-script/Code.gs</code> into Apps Script, run <code>setupBackend</code>, then deploy a new web app version.</span>
      <ul>
        ${issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function findAssignmentMismatches(data) {
  const issues = [];
  const actualByPoster = new Map(data.posters.map((poster) => [poster.id, poster.judges || []]));
  POSTERS.forEach((poster) => {
    const actual = actualByPoster.get(poster.id);
    if (!actual) {
      issues.push(`${poster.id} is missing from backend results.`);
      return;
    }

    const expectedList = sortedList(poster.judges);
    const actualList = sortedList(actual);
    if (expectedList !== actualList) {
      issues.push(`${poster.id}: expected ${expectedList || "-"}, backend returned ${actualList || "-"}.`);
    }
  });

  const expectedJudges = sortedList(uniqueFlat(POSTERS.map((poster) => poster.judges)));
  const actualJudges = sortedList(uniqueFlat(data.posters.map((poster) => poster.judges || [])));
  if (expectedJudges !== actualJudges) {
    issues.unshift(`Expected judges ${expectedJudges}; backend returned ${actualJudges}.`);
  }

  return issues;
}

function buildJudgeCompletion(data) {
  const byJudge = new Map();
  data.posters.forEach((poster) => {
    poster.judges.forEach((judge) => {
      if (!byJudge.has(judge)) {
        byJudge.set(judge, { judge, assigned: [], submitted: 0, missing: [] });
      }
      byJudge.get(judge).assigned.push(poster.id);
    });
  });

  byJudge.forEach((row) => {
    row.assigned.forEach((posterId) => {
      const found = data.submissions.find((submission) => (
        submission.posterId === posterId &&
        submission.judge === row.judge &&
        submission.conflict !== "Yes" &&
        submission.total !== ""
      ));
      if (found) {
        row.submitted += 1;
      } else {
        row.missing.push(posterId);
      }
    });
  });

  return Array.from(byJudge.values()).sort((a, b) => a.judge.localeCompare(b.judge));
}

function missingJudgesForPoster(data, poster) {
  return poster.judges.filter((judge) => {
    return !data.submissions.some((submission) => (
      submission.posterId === poster.id &&
      submission.judge === judge &&
      submission.conflict !== "Yes" &&
      submission.total !== ""
    ));
  });
}

function downloadResultsCsv() {
  if (!state.resultsData) {
    showStatus("Refresh the admin results before downloading CSV.", "error");
    return;
  }

  const headers = [
    "Rank",
    "Poster #",
    "Presenter",
    "Category",
    "Title",
    "Average",
    "Included scores",
    "Expected scores",
    "Missing judges",
    "Judge",
    "Conflict",
    "Total"
  ].concat(RUBRIC.map((item) => item.label), ["Comments"]);

  const rows = [];
  state.resultsData.posters.forEach((poster) => {
    const submissions = state.resultsData.submissions.filter((submission) => submission.posterId === poster.id);
    const missing = missingJudgesForPoster(state.resultsData, poster).join(", ");
    if (!submissions.length) {
      rows.push([
        poster.rank || "",
        poster.id,
        poster.presenter,
        poster.category,
        poster.title,
        poster.average,
        poster.includedCount,
        poster.expectedCount,
        missing,
        "",
        "",
        ""
      ].concat(RUBRIC.map(() => ""), [""]));
      return;
    }
    submissions.forEach((submission) => {
      rows.push([
        poster.rank || "",
        poster.id,
        poster.presenter,
        poster.category,
        poster.title,
        poster.average,
        poster.includedCount,
        poster.expectedCount,
        missing,
        submission.judge,
        submission.conflict,
        submission.total
      ].concat(RUBRIC.map((item) => submission.scores[item.key] || ""), [submission.comments || ""]));
    });
  });

  const csv = [headers].concat(rows).map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gta-poster-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const apiBootstrap = (token) => {
  return jsonpRequest({ action: "bootstrap", token });
};

const apiResults = (adminToken) => {
  return jsonpRequest({ action: "results", admin: adminToken });
};

const apiSave = (payload) => {
  if (payload.adminAccess === "Yes") return postForm({ ...payload, action: "adminSave" });
  return postForm(payload);
};

const apiAdminWorkspace = (adminToken) => {
  return jsonpRequest({ action: "adminWorkspace", admin: adminToken });
};

async function jsonpRequest(query) {
  let lastError = null;
  for (let attempt = 1; attempt <= JSONP_MAX_ATTEMPTS; attempt++) {
    try {
      return await jsonpRequestOnce(query, attempt);
    } catch (error) {
      lastError = error;
      if (attempt < JSONP_MAX_ATTEMPTS) {
        await sleep(500 * attempt);
      }
    }
  }
  throw lastError || new Error("Could not contact Apps Script.");
}

function jsonpRequestOnce(query, attempt) {
  return new Promise((resolve, reject) => {
    if (!config.appsScriptUrl) {
      reject(new Error("Missing Apps Script URL in config.js."));
      return;
    }

    const callback = `gtaCallback_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const url = new URL(config.appsScriptUrl);
    Object.entries({ ...query, callback, _ts: `${Date.now()}-${attempt}` }).forEach(([key, value]) => url.searchParams.set(key, value));

    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out contacting Apps Script."));
    }, JSONP_TIMEOUT_MS);

    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Could not contact Apps Script."));
    };

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callback];
      script.remove();
    }

    script.src = url.toString();
    script.async = true;
    document.body.appendChild(script);
  });
}

function postForm(payload) {
  return new Promise(async (resolve, reject) => {
    if (!config.appsScriptUrl) {
      reject(new Error("Missing Apps Script URL in config.js."));
      return;
    }

    if (window.fetch) {
      try {
        await fetch(config.appsScriptUrl, {
          method: "POST",
          mode: "no-cors",
          body: new URLSearchParams(payload)
        });
        await sleep(1400);
        resolve({ ok: true });
        return;
      } catch {
        // Fall through to the iframe transport for older browsers or strict environments.
      }
    }

    const iframeName = `post_target_${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.className = "hidden-frame";
    document.body.appendChild(iframe);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = config.appsScriptUrl;
    form.target = iframeName;
    form.className = "hidden-frame";

    Object.entries(payload).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.setTimeout(() => {
        iframe.remove();
        form.remove();
      }, 500);
      resolve({ ok: true });
    };

    iframe.addEventListener("load", finish, { once: true });
    document.body.appendChild(form);
    form.submit();
    window.setTimeout(finish, 2500);
  });
}


function totalScore(scores) {
  const values = RUBRIC.map((criterion) => Number(scores[criterion.key]));
  const complete = values.every((value) => Number.isInteger(value) && value >= 1 && value <= 4);
  return {
    complete,
    total: complete ? values.reduce((sum, value) => sum + value, 0) : ""
  };
}

function findPoster(id) {
  return POSTERS.find((poster) => poster.id === id);
}

function showStatus(message, tone = "info", isHtml = false) {
  els.statusPanel.className = `status-panel is-${tone}`;
  els.statusPanel.innerHTML = isHtml ? message : `<span>${escapeHtml(message)}</span>`;
}

function setMode(label) {
  els.modeBadge.textContent = label;
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function shortCategory(category) {
  if (category.startsWith("Early investigator")) return "Early investigator";
  if (category.startsWith("Trainees")) return "Trainee";
  return category;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function sortedList(values) {
  return values.slice().sort((a, b) => a.localeCompare(b)).join(", ");
}

function uniqueFlat(groups) {
  return Array.from(new Set(groups.flat()));
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
