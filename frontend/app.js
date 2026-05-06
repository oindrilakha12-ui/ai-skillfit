/* ============================================================
   AI SkillFit — Application Logic
   ============================================================ */

const API_URL = "http://localhost:8000";
const STORAGE_KEY = "skillfit_interviews";

let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let timerInterval = null;
let timerSeconds = 0;
let currentLang = "en-US";

const questions = {
  "en-US": "Tell me about your skills and experience.",
  "hi-IN": "अपने कौशल और अनुभव के बारे में बताइए।",
  "kn-IN": "ನಿಮ್ಮ ಕೌಶಲ್ಯಗಳು ಮತ್ತು ಅನುಭವದ ಬಗ್ಗೆ ಹೇಳಿ.",
};

// ==================== STORAGE ====================
function getInterviews() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveInterview(data, name) {
  const interviews = getInterviews();
  interviews.push({
    id: Date.now(),
    name: name || "Anonymous",
    timestamp: new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }),
    transcript: data.transcript,
    score: data.score,
    matched_keywords: data.matched_keywords || [],
    category: data.category,
    confidence: data.confidence,
    fraud: data.fraud,
    word_count: data.word_count || 0,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(interviews));
}

function clearDashboard() {
  if (confirm("Clear all interview records?")) {
    localStorage.removeItem(STORAGE_KEY);
    renderDashboard();
  }
}

// ==================== SCREENS ====================
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const t = document.getElementById(id);
  if (!t) return;
  t.style.animation = "none"; t.offsetHeight; t.style.animation = "";
  t.classList.add("active");
}

function goHome() { stopAllMedia(); showScreen("screen-home"); }
function goToInterview() { showScreen("screen-interview"); resetInterviewUI(); initCamera(); }
function retryInterview() { showScreen("screen-interview"); resetInterviewUI(); initCamera(); }
function goToDashboard() { stopAllMedia(); renderDashboard(); showScreen("screen-dashboard"); }

// ==================== LANGUAGE ====================
function updateLanguage() {
  currentLang = document.getElementById("lang-select").value;
  document.getElementById("question-text").textContent = questions[currentLang] || questions["en-US"];
}

// ==================== SPEECH ====================
function speakQuestion() {
  const text = document.getElementById("question-text").textContent;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = currentLang; u.rate = 0.9; u.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ==================== CAMERA ====================
async function initCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: true,
    });
    const video = document.getElementById("camera-preview");
    video.srcObject = mediaStream;
    video.classList.add("visible");
    document.getElementById("camera-placeholder").classList.add("hidden");
  } catch {
    try { mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { alert("Microphone access is required. Please allow and try again."); }
  }
}

function stopAllMedia() {
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  const v = document.getElementById("camera-preview");
  if (v) { v.srcObject = null; v.classList.remove("visible"); }
  const p = document.getElementById("camera-placeholder");
  if (p) p.classList.remove("hidden");
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  window.speechSynthesis.cancel();
}

// ==================== RECORDING ====================
function startRecording() {
  if (!mediaStream) { alert("Allow camera/microphone access first."); return; }
  audioChunks = [];
  const tracks = mediaStream.getAudioTracks();
  if (!tracks.length) { alert("No microphone detected."); return; }

  const audioStream = new MediaStream(tracks);
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";

  mediaRecorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : {});
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
    submitAudio(blob);
  };
  mediaRecorder.start(1000);
  speakQuestion();

  document.getElementById("btn-record").classList.add("hidden");
  document.getElementById("btn-stop").classList.remove("hidden");
  document.getElementById("recording-indicator").classList.remove("hidden");
  document.getElementById("timer-display").classList.remove("hidden");

  timerSeconds = 0; updateTimerDisplay();
  timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(); }, 1000);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  stopAllMedia();
  showScreen("screen-processing");
  animateProcessingSteps();
}

function updateTimerDisplay() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const s = String(timerSeconds % 60).padStart(2, "0");
  document.getElementById("timer-value").textContent = `${m}:${s}`;
}

function resetInterviewUI() {
  document.getElementById("btn-record").classList.remove("hidden");
  document.getElementById("btn-stop").classList.add("hidden");
  document.getElementById("recording-indicator").classList.add("hidden");
  document.getElementById("timer-display").classList.add("hidden");
  document.getElementById("timer-value").textContent = "00:00";
}

// ==================== PROCESSING ====================
function animateProcessingSteps() {
  const steps = ["step-1","step-2","step-3","step-4"];
  let cur = 0;
  steps.forEach(id => { const el = document.getElementById(id); el.classList.remove("active","done"); });
  document.getElementById(steps[0]).classList.add("active");
  const iv = setInterval(() => {
    if (cur < steps.length) { document.getElementById(steps[cur]).classList.replace("active","done") || document.getElementById(steps[cur]).classList.remove("active"); document.getElementById(steps[cur]).classList.add("done"); }
    cur++;
    if (cur < steps.length) document.getElementById(steps[cur]).classList.add("active");
    else clearInterval(iv);
  }, 800);
}

// ==================== API ====================
async function submitAudio(blob) {
  const candidateName = (document.getElementById("candidate-name")?.value || "").trim();
  const formData = new FormData();
  const ext = blob.type.includes("webm") ? "webm" : "wav";
  formData.append("file", blob, `interview_audio.${ext}`);
  formData.append("language", currentLang.split("-")[0]);

  try {
    const res = await fetch(`${API_URL}/analyze`, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    saveInterview(data, candidateName);
    setTimeout(() => displayResults(data), 3500);
  } catch (err) {
    console.error("API Error:", err);
    const errData = {
      transcript: "(Error connecting to server — is the backend running?)",
      score: 0, matched_keywords: [], category: "Error ❌",
      confidence: 0, fraud: "Unable to analyze — check backend connection", word_count: 0,
    };
    saveInterview(errData, candidateName);
    setTimeout(() => displayResults(errData), 3500);
  }
}

// ==================== RESULTS ====================
function displayResults(data) {
  showScreen("screen-results");
  document.getElementById("result-transcript").textContent = data.transcript || "—";
  document.getElementById("result-score").textContent = `${data.score} keyword${data.score !== 1 ? "s" : ""} matched`;
  const kwEl = document.getElementById("result-keywords");
  if (data.matched_keywords?.length) {
    kwEl.innerHTML = data.matched_keywords.map(k => `<span class="keyword-tag">${k}</span>`).join("");
  } else { kwEl.textContent = "None"; }
  document.getElementById("result-wordcount").textContent = `${data.word_count || 0} words`;
  document.getElementById("result-category").textContent = data.category || "—";
  document.getElementById("result-fraud").textContent = data.fraud || "—";
  animateScoreRing(data.confidence || 0);
}

function animateScoreRing(pct) {
  const circ = 2 * Math.PI * 52;
  const offset = circ - (pct / 100) * circ;
  const svg = document.querySelector(".score-ring");
  if (!svg.querySelector("defs")) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg","defs");
    defs.innerHTML = `<linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6c5ce7"/><stop offset="50%" stop-color="#a29bfe"/><stop offset="100%" stop-color="#00cec9"/></linearGradient>`;
    svg.prepend(defs);
  }
  const ring = document.getElementById("score-ring-fill");
  ring.style.stroke = "url(#scoreGradient)";
  setTimeout(() => { ring.style.strokeDashoffset = offset; }, 200);
  const valEl = document.getElementById("score-ring-value");
  let cur = 0; const step = Math.max(1, Math.floor(pct / 40));
  const iv = setInterval(() => {
    cur += step; if (cur >= pct) { cur = pct; clearInterval(iv); }
    valEl.textContent = cur;
  }, 30);
}

// ==================== DASHBOARD ====================
function catClass(cat) {
  if (!cat) return "cat-error";
  if (cat.includes("Job-Ready") || cat.includes("Job Ready")) return "cat-ready";
  if (cat.includes("Training")) return "cat-training";
  if (cat.includes("Low")) return "cat-low";
  return "cat-error";
}

function renderDashboard() {
  const interviews = getInterviews();
  const total = interviews.length;
  const ready = interviews.filter(i => i.category?.includes("Job-Ready") || i.category?.includes("Job Ready")).length;
  const training = interviews.filter(i => i.category?.includes("Training")).length;
  const low = interviews.filter(i => !i.category?.includes("Job-Ready") && !i.category?.includes("Job Ready") && !i.category?.includes("Training")).length;
  const avgConf = total ? Math.round(interviews.reduce((s, i) => s + (i.confidence || 0), 0) / total) : null;

  // Stat cards
  document.getElementById("dash-total").textContent = total;
  document.getElementById("dash-ready").textContent = ready;
  document.getElementById("dash-training").textContent = training;
  document.getElementById("dash-avgconf").textContent = avgConf !== null ? `${avgConf}%` : "—";

  // Distribution bar
  if (total > 0) {
    document.getElementById("dist-ready-bar").style.width    = `${(ready / total) * 100}%`;
    document.getElementById("dist-training-bar").style.width = `${(training / total) * 100}%`;
    document.getElementById("dist-low-bar").style.width      = `${(low / total) * 100}%`;
  } else {
    ["dist-ready-bar","dist-training-bar","dist-low-bar"].forEach(id => {
      document.getElementById(id).style.width = "0%";
    });
  }

  // Confidence bar chart
  const chart = document.getElementById("confidence-chart");
  if (!total) {
    chart.innerHTML = `<div class="chart-empty">No interviews yet. Start one to see data here.</div>`;
  } else {
    chart.innerHTML = interviews.map((iv, i) => {
      const h = Math.max(4, iv.confidence || 0);
      const name = iv.name && iv.name !== "Anonymous" ? iv.name.split(" ")[0] : `#${i+1}`;
      return `<div class="chart-bar-wrap">
        <div class="chart-bar" style="height:${h}px" title="${iv.name} — ${iv.confidence}%"></div>
        <div class="chart-bar-label">${name}</div>
      </div>`;
    }).join("");
  }

  // Table
  const tbody = document.getElementById("candidate-tbody");
  if (!total) {
    tbody.innerHTML = `<tr class="table-empty-row"><td colspan="8">No candidates yet — run an interview to see results</td></tr>`;
  } else {
    tbody.innerHTML = interviews.map((iv, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${iv.name || "—"}</strong></td>
        <td>
          <div class="conf-bar-wrap">
            <div class="conf-bar" style="width:${iv.confidence || 0}px"></div>
            <span>${iv.confidence || 0}%</span>
          </div>
        </td>
        <td>${iv.score ?? "—"}</td>
        <td><span class="cat-badge ${catClass(iv.category)}">${(iv.category || "—").replace(/[✅📚⚠️❌]/g,"").trim()}</span></td>
        <td style="font-size:0.75rem">${(iv.fraud || "—").replace(/[✅⚠️]/g,"").trim()}</td>
        <td>${iv.word_count ?? "—"}</td>
        <td style="font-size:0.72rem;white-space:nowrap">${iv.timestamp || "—"}</td>
      </tr>`).join("");
  }

  // Latest transcript
  const latest = interviews[interviews.length - 1];
  const tSection = document.getElementById("dash-transcript-section");
  if (latest?.transcript) {
    tSection.style.display = "";
    document.getElementById("dash-transcript-text").textContent = latest.transcript;
  } else { tSection.style.display = "none"; }
}

// ==================== KEYWORD TAG STYLES ====================
(function() {
  const s = document.createElement("style");
  s.textContent = `.keyword-tag{display:inline-block;padding:.2rem .55rem;background:rgba(108,92,231,.2);border:1px solid rgba(108,92,231,.3);border-radius:9999px;font-size:.75rem;font-weight:600;color:#a29bfe}`;
  document.head.appendChild(s);
})();
