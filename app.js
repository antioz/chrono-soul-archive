import { CALCULATION_MESSAGES, LONG_DISCLAIMER_TEXT } from "./data/constants.js";
import { generateLife } from "./data/generator.js";

const STORAGE_KEY = "chronoSoulArchiveStateV1";

const state = {
  disclaimerAccepted: false,
  profile: null,
  lives: [],
  shareUnlocked: false,
  paidLives: 0
};

let viewingLifeIndex = 0;

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const disclaimerEl        = document.getElementById("disclaimer");
const formSectionEl       = document.getElementById("form-section");
const statusSectionEl     = document.getElementById("status-section");
const statusTextEl        = document.getElementById("status-text");
const resultsSectionEl    = document.getElementById("results-section");
const resultsListEl       = document.getElementById("results-list");
const actionsEl           = document.getElementById("actions");
const disclaimerTextEl    = document.getElementById("disclaimer-long");
const acceptDisclaimerBtn = document.getElementById("accept-disclaimer");
const shareModal          = document.getElementById("share-modal");
const modalShareConfirm   = document.getElementById("modal-share-confirm");
const modalShareCancel    = document.getElementById("modal-share-cancel");

if (disclaimerTextEl) {
  disclaimerTextEl.textContent = LONG_DISCLAIMER_TEXT;
}

if (new URLSearchParams(window.location.search).get("reset") === "1") {
  localStorage.removeItem(STORAGE_KEY);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    Object.assign(state, JSON.parse(raw));
  } catch (e) {
    console.error("State parse error", e);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Capitalizes first letter after sentence-ending punctuation and at string start
function capitalizeSentences(text) {
  return text.replace(/(^|[.!?]\s+)([а-яёa-z])/gu, (_, before, char) => before + char.toUpperCase());
}

function setLoading(isLoading) {
  statusSectionEl.classList.toggle("hidden", !isLoading);
  resultsSectionEl.classList.toggle("hidden", isLoading);
  actionsEl.innerHTML = "";
}

function getCalculationMessage(lifeNumber) {
  return CALCULATION_MESSAGES[(lifeNumber - 1) % CALCULATION_MESSAGES.length];
}

function currentMaxUnlockedLife() {
  let unlocked = 2;
  if (state.shareUnlocked) unlocked = 3;
  unlocked += state.paidLives;
  return unlocked;
}

function ensureLivesGenerated(targetLife) {
  if (!state.profile) return;
  while (state.lives.length < targetLife) {
    state.lives.push(generateLife(state.profile, state.lives.length + 1));
  }
}

function renderLifeCard(life) {
  const title = life.lifeNumber === 1 ? "Ваша прошлая жизнь" : `Жизнь #${life.lifeNumber}`;
  const story = capitalizeSentences(life.story);
  return `
    <article class="life-card">
      <h3 class="life-card-title">${title}</h3>
      <div class="life-facts">
        <div class="life-fact"><div class="life-field-label">Имя</div><div class="life-field-value">${escapeHtml(life.name)}</div></div>
        <div class="life-fact"><div class="life-field-label">Годы жизни</div><div class="life-field-value">${escapeHtml(life.years)}</div></div>
        <div class="life-fact"><div class="life-field-label">Прожито лет</div><div class="life-field-value">${escapeHtml(String(life.lifeSpan))}</div></div>
        <div class="life-fact"><div class="life-field-label">Эпоха · регион</div><div class="life-field-value">${escapeHtml(life.era)}, ${escapeHtml(life.region)}</div></div>
        <div class="life-fact life-fact-wide"><div class="life-field-label">Профессия</div><div class="life-field-value">${escapeHtml(life.role)}</div></div>
      </div>
      <p class="life-story">${escapeHtml(story)}</p>
    </article>
  `;
}

function renderNavigation() {
  const total = state.lives.length;
  if (total <= 1) return "";
  const prevOk = viewingLifeIndex > 0;
  const nextOk = viewingLifeIndex < total - 1;
  return `
    <div class="life-nav">
      <button class="life-nav-btn" id="nav-prev" ${prevOk ? "" : "disabled"}>← Жизнь #${viewingLifeIndex}</button>
      <span class="life-nav-counter">${viewingLifeIndex + 1} / ${total}</span>
      <button class="life-nav-btn" id="nav-next" ${nextOk ? "" : "disabled"}>Жизнь #${viewingLifeIndex + 2} →</button>
    </div>
  `;
}

function renderActions() {
  const isLatest = viewingLifeIndex === state.lives.length - 1;
  if (!isLatest) { actionsEl.innerHTML = ""; return; }

  const maxUnlocked = currentMaxUnlockedLife();
  const nextLife = state.lives.length + 1;
  let html = `<div class="action-row">`;

  if (nextLife <= maxUnlocked) {
    html += `<button class="btn btn-primary" id="open-next">Открыть жизнь №${nextLife}</button>`;
  } else if (nextLife === 3 && !state.shareUnlocked) {
    html += `<button class="btn btn-primary" id="share-btn">Предыдущая жизнь</button>`;
  } else {
    html += `<button class="btn btn-primary" id="pay-stars-btn">Открыть жизнь №${nextLife} за Stars (демо)</button>`;
  }

  html += `</div>`;
  actionsEl.innerHTML = html;

  document.getElementById("open-next")?.addEventListener("click", () => openNextLife());
  document.getElementById("share-btn")?.addEventListener("click", () => showShareModal());
  document.getElementById("pay-stars-btn")?.addEventListener("click", async () => {
    state.paidLives += 1;
    saveState();
    await openNextLife();
  });
}

function renderResults() {
  if (!state.profile || state.lives.length === 0) return;
  viewingLifeIndex = Math.max(0, Math.min(viewingLifeIndex, state.lives.length - 1));

  resultsListEl.innerHTML = renderNavigation() + renderLifeCard(state.lives[viewingLifeIndex]);

  document.getElementById("nav-prev")?.addEventListener("click", () => {
    viewingLifeIndex = Math.max(0, viewingLifeIndex - 1);
    renderResults();
  });
  document.getElementById("nav-next")?.addEventListener("click", () => {
    viewingLifeIndex = Math.min(state.lives.length - 1, viewingLifeIndex + 1);
    renderResults();
  });

  renderActions();
}

async function openNextLife() {
  const nextLifeNumber = state.lives.length + 1;
  if (nextLifeNumber > currentMaxUnlockedLife()) return;

  resultsSectionEl.classList.add("hidden");
  setLoading(true);
  statusTextEl.textContent = getCalculationMessage(nextLifeNumber);
  await new Promise(resolve => setTimeout(resolve, 3000));
  ensureLivesGenerated(nextLifeNumber);
  saveState();
  viewingLifeIndex = state.lives.length - 1;
  setLoading(false);
  renderResults();
}

function showShareModal() {
  shareModal.classList.remove("hidden");
}

function hideShareModal() {
  shareModal.classList.add("hidden");
}

modalShareConfirm?.addEventListener("click", async () => {
  hideShareModal();
  state.shareUnlocked = true;
  saveState();
  shareResult();
  await openNextLife();
});

modalShareCancel?.addEventListener("click", hideShareModal);

function shareResult() {
  const text = encodeURIComponent("Мой хронологический профиль прошлых воплощений уже готов. Проверь свой.");
  const url = encodeURIComponent("https://t.me");
  const shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }
}

function initFlow() {
  if (!disclaimerEl) state.disclaimerAccepted = true;

  if (!state.disclaimerAccepted && disclaimerEl) {
    disclaimerEl.classList.remove("hidden");
    formSectionEl.classList.add("hidden");
    resultsSectionEl.classList.add("hidden");
    return;
  }

  if (disclaimerEl) disclaimerEl.classList.add("hidden");
  formSectionEl.classList.toggle("hidden", !!state.profile);
  resultsSectionEl.classList.toggle("hidden", !state.profile);

  if (state.profile && state.lives.length > 0) {
    viewingLifeIndex = state.lives.length - 1;
    renderResults();
  }
}

acceptDisclaimerBtn?.addEventListener("click", () => {
  state.disclaimerAccepted = true;
  saveState();
  initFlow();
});

document.getElementById("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const birthDate = document.getElementById("birthDate").value;
  const city = document.getElementById("city").value.trim();
  const name = document.getElementById("name").value.trim();

  if (!birthDate || !city) return;

  const dateObj = new Date(birthDate);
  const now = new Date();
  const year = dateObj.getFullYear();
  if (isNaN(dateObj.getTime()) || dateObj >= now || year < 1900 || year > now.getFullYear()) {
    alert("Пожалуйста, введи корректную дату рождения (1900 — сегодня).");
    return;
  }

  if (!/^[a-zA-Zа-яА-ЯёЁ\s\-]{2,}$/.test(city)) {
    alert("Пожалуйста, введи название города (только буквы, минимум 2 символа).");
    return;
  }

  state.profile = { birthDate, city, name };
  state.lives = [];
  state.shareUnlocked = false;
  state.paidLives = 0;
  saveState();

  formSectionEl.classList.add("hidden");
  resultsSectionEl.classList.remove("hidden");

  await openNextLife();
});

loadState();
initFlow();
