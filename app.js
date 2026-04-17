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

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const disclaimerEl = document.getElementById("disclaimer");
const formSectionEl = document.getElementById("form-section");
const statusSectionEl = document.getElementById("status-section");
const statusTextEl = document.getElementById("status-text");
const resultsSectionEl = document.getElementById("results-section");
const resultsListEl = document.getElementById("results-list");
const actionsEl = document.getElementById("actions");
const disclaimerTextEl = document.getElementById("disclaimer-long");
const acceptDisclaimerBtn = document.getElementById("accept-disclaimer");

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
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch (error) {
    console.error("State parse error", error);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setLoading(isLoading) {
  statusSectionEl.classList.toggle("hidden", !isLoading);
}

function getCalculationMessage(nextLifeNumber) {
  const idx = (nextLifeNumber - 1) % CALCULATION_MESSAGES.length;
  return CALCULATION_MESSAGES[idx];
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
    const nextLifeNumber = state.lives.length + 1;
    state.lives.push(generateLife(state.profile, nextLifeNumber));
  }
}

function renderLifeCard(life) {
  const title = life.lifeNumber === 1
    ? "ВАША ПРОШЛАЯ ЖИЗНЬ"
    : `Жизнь #${life.lifeNumber}`;

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
      <p class="life-story">${escapeHtml(life.story)}</p>
    </article>
  `;
}

function renderActions() {
  const maxUnlocked = currentMaxUnlockedLife();
  const nextLife = state.lives.length + 1;
  let html = `<div class="action-row">`;

  if (nextLife <= maxUnlocked) {
    html += `<button class="btn" id="open-next">Открыть жизнь №${nextLife}</button>`;
  } else if (nextLife === 3 && !state.shareUnlocked) {
    html += `<button class="btn" id="share-btn">Поделиться и открыть жизнь №3</button>`;
  } else {
    html += `<button class="btn" id="pay-stars-btn">Открыть жизнь №${nextLife} за Stars (демо)</button>`;
  }

  html += `</div>`;
  actionsEl.innerHTML = html;

  const openNextBtn = document.getElementById("open-next");
  if (openNextBtn) {
    openNextBtn.addEventListener("click", async () => {
      await openNextLife();
    });
  }

  const shareBtn = document.getElementById("share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      state.shareUnlocked = true;
      saveState();
      shareResult();
      await openNextLife();
    });
  }

  const payBtn = document.getElementById("pay-stars-btn");
  if (payBtn) {
    payBtn.addEventListener("click", async () => {
      state.paidLives += 1;
      saveState();
      await openNextLife();
    });
  }

}

function renderResults() {
  if (!state.profile) return;
  resultsListEl.innerHTML = state.lives.map(renderLifeCard).join("");
  renderActions();
}

async function openNextLife() {
  const nextLifeNumber = state.lives.length + 1;
  if (nextLifeNumber > currentMaxUnlockedLife()) return;

  setLoading(true);
  statusTextEl.textContent = getCalculationMessage(nextLifeNumber);
  await new Promise((resolve) => setTimeout(resolve, 1400));
  ensureLivesGenerated(nextLifeNumber);
  saveState();
  setLoading(false);
  renderResults();
}

function shareResult() {
  const text = encodeURIComponent(
    "Мой хронологический профиль прошлых воплощений уже готов. Проверь свой."
  );
  const url = encodeURIComponent("https://t.me");
  const shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }
}

function initFlow() {
  if (!disclaimerEl) {
    state.disclaimerAccepted = true;
  }

  if (!state.disclaimerAccepted && disclaimerEl) {
    disclaimerEl.classList.remove("hidden");
    formSectionEl.classList.add("hidden");
    resultsSectionEl.classList.add("hidden");
    return;
  }

  if (disclaimerEl) {
    disclaimerEl.classList.add("hidden");
  }
  formSectionEl.classList.toggle("hidden", !!state.profile);
  resultsSectionEl.classList.toggle("hidden", !state.profile);

  if (state.profile) {
    renderResults();
  }
}

if (acceptDisclaimerBtn) {
  acceptDisclaimerBtn.addEventListener("click", () => {
    state.disclaimerAccepted = true;
    saveState();
    initFlow();
  });
}

document.getElementById("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const birthDate = document.getElementById("birthDate").value;
  const city = document.getElementById("city").value.trim();
  const name = document.getElementById("name").value.trim();

  if (!birthDate || !city) return;

  // Validate date: must be in past, year 1900–current year
  const dateObj = new Date(birthDate);
  const now = new Date();
  const year = dateObj.getFullYear();
  if (isNaN(dateObj.getTime()) || dateObj >= now || year < 1900 || year > now.getFullYear()) {
    alert("Пожалуйста, введи корректную дату рождения (1900 — сегодня).");
    return;
  }

  // Validate city: only letters, spaces, hyphens; min 2 chars
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
