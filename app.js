import { CALCULATION_MESSAGES, LONG_DISCLAIMER_TEXT } from "./data/constants.js";
import { generateLife } from "./data/generator.js";

const STORAGE_KEY = "chronoSoulArchiveStateV1";
const API = "https://chrono-soul-backend-production.up.railway.app";

const state = {
  disclaimerAccepted: false,
  profile: null,
  lives: [],
  shareUnlocked: false,
  channelUnlocked: false,
  paidLives: 0
};

let viewingLifeIndex = 0;

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Telegram user ID if available
const tgUserId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;

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

// ── Date mask: auto-insert dots as user types ───────
const birthDateInput = document.getElementById("birthDate");
if (birthDateInput) {
  birthDateInput.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (v.length >= 5) v = v.slice(0, 2) + "." + v.slice(2, 4) + "." + v.slice(4);
    else if (v.length >= 3) v = v.slice(0, 2) + "." + v.slice(2);
    e.target.value = v;
  });
}

if (new URLSearchParams(window.location.search).get("reset") === "1") {
  localStorage.removeItem(STORAGE_KEY);
}

// ── State persistence ───────────────────────────────

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

// ── Auth headers ────────────────────────────────────

function authHeaders() {
  const initData = tg?.initData;
  const h = { "Content-Type": "application/json" };
  if (initData) h["X-Telegram-Init-Data"] = initData;
  return h;
}

// ── Analytics ───────────────────────────────────────

function track(event, payload) {
  fetch(`${API}/api/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: tgUserId, event, payload })
  }).catch(() => {});
}

// ── Backend API ─────────────────────────────────────

async function apiLoadUser() {
  if (!tgUserId) return;
  try {
    const res = await fetch(`${API}/api/user/${tgUserId}`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    state.shareUnlocked = data.shareUnlocked;
    state.channelUnlocked = data.channelUnlocked ?? false;
    state.paidLives = data.paidLives;
    if (data.lives?.length) {
      state.lives = data.lives;
    }
  } catch (e) {
    console.error("apiLoadUser error", e);
  }
}

async function apiSaveLife(life) {
  if (!tgUserId) return;
  try {
    await fetch(`${API}/api/user/${tgUserId}/life`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ lifeNumber: life.lifeNumber, payload: life })
    });
  } catch (e) {
    console.error("apiSaveLife error", e);
  }
}

async function apiUnlockShare() {
  if (!tgUserId) return;
  try {
    await fetch(`${API}/api/user/${tgUserId}/share`, { method: "POST", headers: authHeaders() });
  } catch (e) {
    console.error("apiUnlockShare error", e);
  }
}

async function apiSendInvoice(lifeNumber) {
  if (!tgUserId) return null;
  try {
    const res = await fetch(`${API}/api/user/${tgUserId}/invoice`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ lifeNumber })
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.error("apiSendInvoice error", e);
    return null;
  }
}

// ── UI helpers ──────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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
  if (state.channelUnlocked) unlocked = 4;
  unlocked += state.paidLives;
  return unlocked;
}

function ensureLivesGenerated(targetLife) {
  if (!state.profile) return;
  while (state.lives.length < targetLife) {
    const life = generateLife(state.profile, state.lives.length + 1);
    state.lives.push(life);
    apiSaveLife(life);
  }
}

// ── Render ──────────────────────────────────────────

function lifeImageStyle(era) {
  if (!era || era.includes("XX")) return "classic studio portrait photograph, black and white, 1940s, formal, sharp focus";
  if (era.includes("XIX") || era.includes("Викториан") || era.includes("Индустриал")) return "daguerreotype portrait, sepia tone, 1880s vintage photograph, grainy, formal pose";
  if (era.includes("XVIII") || era.includes("Просвещ") || era.includes("барок")) return "oil portrait painting, baroque style, candlelight, chiaroscuro, 18th century";
  if (era.includes("Ренессанс") || era.includes("Новое время")) return "Renaissance oil portrait painting, detailed, warm tones, classical composition";
  return "medieval illuminated manuscript style portrait, tempera painting, flat perspective, gold accents";
}

function lifeImageUrl(life) {
  const style = lifeImageStyle(life.era);
  const gender = life.isFemale ? "woman" : "man";
  const prompt = encodeURIComponent(`${gender}, ${life.role} in ${life.region}, ${style}, no text, no watermark, portrait`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=512&height=640&nologo=true&seed=${life.lifeNumber * 31 + 7}`;
}

function storyToParagraphs(story) {
  const sentences = capitalizeSentences(story).split(/(?<=[.!?])\s+/);
  const paras = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paras.push(sentences.slice(i, i + 2).join(" "));
  }
  return paras.map(p => `<p class="life-story-para">${escapeHtml(p)}</p>`).join("");
}

function renderLifeCard(life) {
  const imgUrl = lifeImageUrl(life);
  const settlementText = life.settlement ? ` · ${escapeHtml(life.settlement)}` : "";
  const discoveryHtml = life.selfDiscovery?.length
    ? `<div class="self-discovery-block">
        <div class="self-discovery-title">Для исследования себя</div>
        ${life.selfDiscovery.map(d => `<div class="self-discovery-item">◈ ${escapeHtml(d)}</div>`).join("")}
       </div>`
    : "";
  return `
    <article class="life-card">
      <div class="life-card-image-wrap" id="img-wrap-${life.lifeNumber}">
        <div class="life-card-image-skeleton"></div>
        <img class="life-card-image" src="${imgUrl}" alt="${escapeHtml(life.era)}"
          onload="this.classList.add('loaded');this.previousElementSibling.style.display='none'"
          onerror="this.parentElement.style.display='none'" />
      </div>
      <div class="life-card-header">
        <h3 class="life-card-title">${escapeHtml(life.name)}</h3>
        <span class="life-card-years">${escapeHtml(life.years)} · ${escapeHtml(String(life.lifeSpan))} лет${settlementText}</span>
      </div>
      <div class="life-tags">
        <span class="life-tag life-tag-era">${escapeHtml(life.era)}</span>
        <span class="life-tag">${escapeHtml(life.region)}</span>
        <span class="life-tag">${escapeHtml(life.role)}</span>
      </div>
      <div class="life-story">${storyToParagraphs(life.story)}</div>
      ${discoveryHtml}
      <button class="share-life-btn" id="share-life-btn-${life.lifeNumber}">↗ Поделиться</button>
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
    html += `<button class="btn btn-primary" id="share-btn">Открыть бесплатно — поделиться</button>`;
  } else if (nextLife === 4 && !state.channelUnlocked) {
    html += `<button class="btn btn-primary" id="channel-btn">Открыть бесплатно — подписаться на канал</button>`;
  } else {
    html += `<button class="btn btn-primary" id="pay-stars-btn">Открыть жизнь №${nextLife} за Stars ✦</button>`;
  }

  html += `</div>`;
  actionsEl.innerHTML = html;

  document.getElementById("open-next")?.addEventListener("click", () => openNextLife());
  document.getElementById("share-btn")?.addEventListener("click", () => showShareModal());
  document.getElementById("channel-btn")?.addEventListener("click", () => {
    const channelUrl = "https://t.me/webthreesome";
    if (tg?.openTelegramLink) tg.openTelegramLink(channelUrl);
    else window.open(channelUrl, "_blank");
    // После открытия канала проверяем подписку через бэкенд
    if (tgUserId) {
      setTimeout(async () => {
        const res = await fetch(`${API}/api/user/${tgUserId}/check-channel`, { headers: authHeaders() });
        const data = res.ok ? await res.json() : null;
        if (data?.subscribed) {
          state.channelUnlocked = true;
          saveState();
          openNextLife();
        } else {
          alert("Подпишись на канал @webthreesome и нажми кнопку снова.");
        }
      }, 3000);
    } else {
      state.channelUnlocked = true;
      saveState();
      openNextLife();
    }
  });
  document.getElementById("pay-stars-btn")?.addEventListener("click", async () => {
    const nextLifeNumber = state.lives.length + 1;
    if (tgUserId) {
      track("payment_initiated", { lifeNumber: nextLifeNumber });
      const result = await apiSendInvoice(nextLifeNumber);
      if (result?.link && tg?.openInvoice) {
        tg.openInvoice(result.link, (status) => {
          if (status === "paid") {
            track("payment_completed", { lifeNumber: nextLifeNumber });
            state.paidLives += 1;
            saveState();
            openNextLife();
          }
        });
      } else if (result?.link) {
        // Fallback: open invoice link in browser
        window.open(result.link, "_blank");
      } else {
        alert("Не удалось создать счёт. Попробуй ещё раз.");
      }
    } else {
      // Demo mode (browser without Telegram)
      state.paidLives += 1;
      saveState();
      await openNextLife();
    }
  });
}

function renderResults() {
  if (!state.profile || state.lives.length === 0) return;
  viewingLifeIndex = Math.max(0, Math.min(viewingLifeIndex, state.lives.length - 1));

  resultsListEl.innerHTML = renderNavigation() + renderLifeCard(state.lives[viewingLifeIndex]);

  document.getElementById(`share-life-btn-${state.lives[viewingLifeIndex]?.lifeNumber}`)
    ?.addEventListener("click", () => shareResult());

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

// ── Life flow ───────────────────────────────────────

async function openNextLife() {
  const nextLifeNumber = state.lives.length + 1;
  if (nextLifeNumber > currentMaxUnlockedLife()) return;

  resultsSectionEl.classList.add("hidden");
  setLoading(true);

  const funnySteps = [
    "Запрашиваем медиума...",
    "Связываемся с колдуном...",
    "Отправляем запрос в космос...",
    "Ждём ответа от Вселенной...",
    "Сверяемся с картами Таро...",
    "Активируем третий глаз...",
    "Консультируемся с духами предков...",
    "Расшифровываем послание звёзд...",
    "Проверяем ваш астральный след...",
    "Ченнелинг завершён, обрабатываем данные...",
    "Пробуждаем коллективное бессознательное...",
    "Синхронизируем чакры с архивом...",
  ];
  const pickFunny = (i) => funnySteps[(nextLifeNumber * 7 + i) % funnySteps.length];

  const steps = nextLifeNumber >= 3
    ? [pickFunny(0), pickFunny(1), pickFunny(2), getCalculationMessage(nextLifeNumber)]
    : ["Анализируем дату рождения...", "Сканируем архивы эпох...", "Находим точку пересечения судеб...", getCalculationMessage(nextLifeNumber)];
  for (const step of steps) {
    statusTextEl.classList.remove("status-text-fade");
    void statusTextEl.offsetWidth;
    statusTextEl.classList.add("status-text-fade");
    statusTextEl.textContent = step;
    await new Promise(resolve => setTimeout(resolve, 900));
  }
  ensureLivesGenerated(nextLifeNumber);
  saveState();
  track("life_opened", { lifeNumber: nextLifeNumber });
  viewingLifeIndex = state.lives.length - 1;
  setLoading(false);
  renderResults();
}

// ── Share modal ─────────────────────────────────────

function showShareModal() {
  const life = state.lives[viewingLifeIndex];
  if (life) {
    const imgEl = document.getElementById("modal-life-image");
    if (imgEl) imgEl.src = lifeImageUrl(life);
    const nameEl = document.getElementById("modal-life-name");
    if (nameEl) nameEl.textContent = `${life.name} · ${life.era}`;
    const excerptEl = document.getElementById("modal-life-excerpt");
    if (excerptEl) {
      const sentences = life.story.split(/(?<=[.!?])\s+/);
      excerptEl.textContent = sentences.slice(0, Math.ceil(sentences.length / 2)).join(" ");
    }
  }
  shareModal.classList.remove("hidden");
}
function hideShareModal() { shareModal.classList.add("hidden"); }

modalShareConfirm?.addEventListener("click", async () => {
  hideShareModal();
  state.shareUnlocked = true;
  saveState();
  await apiUnlockShare();
  track("share_confirmed");
  shareResult();
  await openNextLife();
});

modalShareCancel?.addEventListener("click", hideShareModal);

function shareLifeCard() {
  shareResult();
}

function shareResult() {
  const ref = tgUserId ? `?start=ref_${tgUserId}` : "";
  const botUrl = `https://t.me/previoslifebot${ref}`;
  const text = encodeURIComponent("Узнал, кем был в прошлой жизни. Попробуй и ты 👇");
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${text}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }
}

// ── Init ────────────────────────────────────────────

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

  // Parse dd.mm.yyyy mask
  const parts = birthDate.split(".");
  if (parts.length !== 3 || parts[2].length !== 4) {
    alert("Введи дату в формате ДД.ММ.ГГГГ");
    return;
  }
  const [dd, mm, yyyy] = parts.map(Number);
  const dateObj = new Date(yyyy, mm - 1, dd);
  const now = new Date();
  if (
    isNaN(dateObj.getTime()) ||
    dateObj.getDate() !== dd || dateObj.getMonth() !== mm - 1 ||
    dateObj >= now || yyyy < 1900 || yyyy > now.getFullYear()
  ) {
    alert("Пожалуйста, введи корректную дату рождения (1900 — сегодня).");
    return;
  }
  // Convert to ISO for downstream use
  const isoDate = `${yyyy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;

  if (!/^[a-zA-Zа-яА-ЯёЁ\s\-]{2,}$/.test(city)) {
    alert("Пожалуйста, введи название города (только буквы, минимум 2 символа).");
    return;
  }

  const submitBtn = event.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Проверяем город...";
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=0`,
      { headers: { "Accept-Language": "ru", "User-Agent": "ChronoSoulArchive/1.0" } }
    );
    const data = await res.json();
    const isCity = data.length > 0 && ["place", "boundary"].includes(data[0].class);
    if (!isCity) {
      alert("Город не найден. Пожалуйста, введи реальный город.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Узнать прошлую жизнь";
      return;
    }
  } catch {
    // При ошибке сети пропускаем проверку
  }
  submitBtn.disabled = false;
  submitBtn.textContent = "Узнать прошлую жизнь";

  state.profile = { birthDate: isoDate, city, name };
  state.lives = [];
  state.shareUnlocked = false;
  state.paidLives = 0;
  saveState();
  track("form_submit");

  formSectionEl.classList.add("hidden");
  resultsSectionEl.classList.remove("hidden");

  await openNextLife();
});

// Load local state, then sync from backend if in Telegram
loadState();
if (tgUserId) {
  track("app_open");
  apiLoadUser().then(() => initFlow());
} else {
  initFlow();
}
