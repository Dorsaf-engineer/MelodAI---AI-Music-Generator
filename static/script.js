// ─── État global ─────────────────────────────────────────────────────────────
let isGenerating = false;

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function setPrompt(text) {
  document.getElementById("prompt").value = text;
  document.getElementById("prompt").focus();
}

function showError(msg) {
  const box = document.getElementById("error-box");
  document.getElementById("error-text").textContent = "⚠ " + msg;
  box.style.display = "block";
  setTimeout(() => (box.style.display = "none"), 8000);
}

function hideError() {
  document.getElementById("error-box").style.display = "none";
}

function setLoading(loading) {
  isGenerating = loading;
  const btn = document.getElementById("generate-btn");
  const progressWrap = document.getElementById("progress-wrap");

  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Génération en cours…`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Générer la musique`;

  progressWrap.style.display = loading ? "flex" : "none";

  if (loading) animateProgress();
}

function animateProgress() {
  const steps = [
    "Chargement du modèle MusicGen…",
    "Enrichissement du prompt par l'IA…",
    "Génération de la musique en cours…",
    "Finalisation de l'audio…"
  ];
  let i = 0;
  const textEl = document.getElementById("progress-text");
  textEl.textContent = steps[0];

  const interval = setInterval(() => {
    if (!isGenerating) { clearInterval(interval); return; }
    i = (i + 1) % steps.length;
    textEl.textContent = steps[i];
  }, 4000);
}

// ─── Génération ──────────────────────────────────────────────────────────────
async function generateMusic() {
  if (isGenerating) return;

  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) {
    showError("Merci d'entrer une description de la musique souhaitée.");
    return;
  }

  const duration = document.getElementById("duration").value;
  hideError();
  setLoading(true);
  document.getElementById("result-card").style.display = "none";

  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, duration: parseInt(duration) })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur lors de la génération.");
    }

    // Afficher le résultat
    showResult(data, prompt);
    loadHistory();

  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function showResult(data, originalPrompt) {
  const card = document.getElementById("result-card");
  const player = document.getElementById("audio-player");
  const downloadBtn = document.getElementById("download-btn");
  const enrichiText = document.getElementById("prompt-enrichi-text");

  player.src = data.audio_url;
  downloadBtn.href = data.audio_url;
  downloadBtn.download = data.filename || "music.wav";
  enrichiText.textContent = data.prompt_enrichi || originalPrompt;

  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  player.play().catch(() => {});
}

// ─── Historique ──────────────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const response = await fetch("/history");
    const history = await response.json();
    renderHistory(history);
  } catch (err) {
    console.error("Erreur historique:", err);
  }
}

function renderHistory(history) {
  const container = document.getElementById("history-list");

  if (!history || history.length === 0) {
    container.innerHTML = '<p class="empty-history">Aucune génération pour l\'instant.</p>';
    return;
  }

  container.innerHTML = history.map(item => {
    const date = new Date(item.timestamp * 1000);
    const formattedDate = date.toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    });

    return `
      <div class="history-item">
        <div class="history-icon">🎵</div>
        <div class="history-info">
          <div class="history-prompt" title="${escapeHtml(item.prompt_original)}">
            ${escapeHtml(item.prompt_original)}
          </div>
          <div class="history-meta">${formattedDate} · ${item.duration}s</div>
        </div>
        <button class="history-play" onclick="playFromHistory('/audio/${escapeHtml(item.filename)}', '${escapeHtml(item.prompt_original)}', '${escapeHtml(item.prompt_enrichi)}')">
          ▶ Écouter
        </button>
      </div>
    `;
  }).join("");
}

function playFromHistory(audioUrl, promptOriginal, promptEnrichi) {
  const card = document.getElementById("result-card");
  const player = document.getElementById("audio-player");
  const downloadBtn = document.getElementById("download-btn");
  const enrichiText = document.getElementById("prompt-enrichi-text");

  player.src = audioUrl;
  downloadBtn.href = audioUrl;
  downloadBtn.download = audioUrl.split("/").pop();
  enrichiText.textContent = promptEnrichi || promptOriginal;

  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  player.play().catch(() => {});
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── CSS animation spin ───────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadHistory();

  // Générer avec Entrée (Ctrl+Enter dans le textarea)
  document.getElementById("prompt").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) generateMusic();
  });
});