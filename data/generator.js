// ПРАВИЛО СКЛОНЕНИЙ: каждый массив контента имеет параллельные массивы для нужных падежей.
// Порядок элементов должен строго совпадать. При добавлении новой записи — добавлять
// соответствующие формы во все связанные массивы (_PREP, _GEN, _INSTR).
import {
  ENDINGS,
  ERAS,
  ERAS_GEN,
  ERAS_PREP,
  FAMILY_LINES,
  HAPPINESS,
  KEY_EVENTS,
  MODERN_20TH_CENTURY_ROLES,
  MODERN_20TH_CENTURY_ROLES_GEN,
  MODERN_20TH_CENTURY_ROLES_INSTR,
  NAMES_BY_REGION,
  NAMES_HISTORICAL,
  NAMES_MODERN,
  REGIONS,
  REGIONS_PREP,
  ROLES,
  ROLES_GEN,
  ROLES_INSTR,
  TRAITS
} from "./constants.js";

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick(list, seed) {
  return list[seed % list.length];
}

// Year ranges [start, end] matching each era — same order as ERAS array
const ERA_YEAR_RANGES = [
  [200,   600],  // Поздняя античность
  [500,  1000],  // Раннее средневековье
  [1400, 1600],  // Эпоха Ренессанса
  [1800, 1900],  // Индустриальный XIX век
  [1900, 1960],  // Начало XX века
  [1000, 1400],  // Позднее средневековье
  [1400, 1600],  // Эпоха великих открытий
  [1700, 1800],  // Просвещение XVIII века
  [-300,   30],  // Эпоха эллинизма
  [1300, 1900],  // Османская эпоха
  [ -27,  476],  // Имперский Рим
  [1500, 1700],  // Раннее Новое время
  [1600, 1750],  // Эпоха барокко
  [1837, 1901],  // Викторианская эра
  [1096, 1291],  // Эпоха крестовых походов
  [-206,  220],  // Ханьская династия
  [ 750, 1258],  // Арабский золотой век
  [ 800, 1100],  // Эпоха викингов
  [1185, 1868],  // Феодальная Япония
  [1368, 1644],  // Эпоха Мин
];

function pickEraByYear(birthYear, seed) {
  const candidates = ERAS
    .map((era, i) => ({ era, i, range: ERA_YEAR_RANGES[i] }))
    .filter(({ range }) => birthYear >= range[0] && birthYear <= range[1]);
  const pool = candidates.length ? candidates : ERAS.map((era, i) => ({ era, i }));
  const chosen = pool[seed % pool.length];
  return { era: chosen.era, eraIdx: chosen.i };
}

function getProfileBirthYear(birthDate) {
  const year = Number.parseInt(String(birthDate).slice(0, 4), 10);
  return Number.isNaN(year) ? 2000 : year;
}

const BEAT_OPENING = [
  "{name}, родившийся в {region_prep} в эпоху {era_gen}, был из тех, кого жизнь формирует не мягко, а методично — как вода точит камень, не спрашивая, согласен ли ты с этим процессом.",
  "Время действия — {era}. Место — {region}. {name} появился на свет в тот момент, когда эпоха уже знала, что сделает с такими людьми, но ещё не успела сообщить им об этом лично.",
  "{name} вырос в {region_prep}, в самый разгар {era_gen}, когда вокруг было достаточно хаоса, чтобы умный человек мог найти в нём своё место — или потеряться в нём окончательно, что, впрочем, тоже случалось.",
  "Про {era} говорят по-разному, но {name}, выросший в {region_prep}, знал её не из книг и не из чужих рассказов — он знал её изнутри, потому что другой жизни у него просто не существовало.",
  "{region}, {era} — звучит как строчка из учебника истории. Но для {name} это было просто домом, со всеми вытекающими: шумом, запахами, людьми, которых не выбирают, и обстоятельствами, которые выбирают тебя.",
  "В {era_prep}, в {region_prep}, рождались люди, которых история потом не запомнит по именам, но без которых она бы не случилась именно такой. {name} был одним из них — что само по себе уже кое-что значит."
];

const BEAT_CHARACTER = [
  "По роду занятий — {role}, что в те времена означало не просто работу, а целый способ существования в мире. {trait} — именно это качество, неудобное в быту и незаменимое в деле, делало его тем, кем он был на самом деле.",
  "Работал {role_instr}, и делал это с той особенной обстоятельностью, которая отличает людей, нашедших своё место не от хорошей жизни, а от полного понимания, что другого места нет. {trait}, и окружающие это чувствовали — одни с уважением, другие с лёгким раздражением.",
  "{role} — профессия, которая не располагает к лишним словам, и {name} лишних слов не говорил: {trait}, что в сочетании с его занятием производило на людей впечатление либо надёжности, либо холодности, в зависимости от того, нужен ли ты им был.",
  "Выбор в пользу {role_gen} был не столько выбором, сколько стечением обстоятельств, которое в итоге оказалось точным попаданием. {trait} — это проявлялось во всём, что он делал, иногда явно на пользу, иногда очевидно во вред.",
  "Его знали как {role}, и этого, в общем-то, было достаточно для репутации в то время. {trait} — редкое сочетание для своей эпохи, которое одни считали несомненным достоинством, другие — необъяснимой странностью.",
  "Профессия {role_gen} в ту эпоху — это не строчка в биографии, это, по существу, судьба. {trait}: именно так описывали его те, кто сталкивался с ним по делу, и именно это определяло все его решения — большие и совсем маленькие."
];

const BEAT_FAMILY = [
  "Семья сложилась так: {family} — и за этой короткой формулировкой прячется, как водится, целая история с деталями, которые никто не удосужился записать, а теперь уже и не запишет.",
  "В личной жизни — {family}. Это не много и не мало. Это просто то, что осталось, когда всё остальное прошло и улеглось.",
  "{family} — примерно так выглядела личная жизнь, если описывать её коротко. Если описывать длинно, там были и радость, и усталость, и моменты, когда хотелось всё бросить, но почему-то не бросал.",
  "Близкие — {family}. Именно они, а не события и не карьера, определяли в конечном счёте, каким он возвращался домой каждый вечер: опустошённым или, наоборот, способным продолжать.",
  "На личном фронте — {family}, что по меркам той эпохи было вполне обычной историей, хотя для самого {name} не было в этом ровным счётом ничего обычного.",
  "{family} — вот и вся личная история, если формулировать без прикрас. Но именно эта часть жизни, как правило, объясняет всё остальное лучше, чем любые внешние события и видимые достижения."
];

const BEAT_EVENT = [
  "Переломным стало то, что {event} — после чего жизнь разделилась на до и после с той чёткостью, которая бывает только у вещей, которые невозможно отменить и трудно объяснить.",
  "Главным, что случилось, было следующее: {event}. Долго обдумывал, правильно ли поступил в тот момент. Так окончательно и не решил.",
  "Среди всего, что произошло, особняком стоит одно: {event}. Это не обязательно самое громкое событие в биографии — просто то, которое изменило траекторию всего остального.",
  "Был момент, определивший всё дальнейшее: {event}. После этого стало понятно, что прежним он уже не будет — вопрос был только в том, каким именно станет.",
  "Жизнь подбросила главное испытание именно тогда, когда он был меньше всего к нему готов: {event}. Справился — но это потребовало таких внутренних затрат, которые потом давали о себе знать ещё очень долго.",
  "Если искать точку, после которой всё пошло именно так, а не иначе, то это она: {event}. Случайность это была или закономерность — вопрос, на который уже нет никакого ответа."
];

const BEAT_ENDING = [
  "Финал был таков: {ending}. {happiness} — и это, пожалуй, честная оценка жизни, которая могла сложиться совсем иначе, но сложилась именно так, и не факт, что это хуже.",
  "{ending} — именно так закончилась эта история. {happiness}: именно такими словами можно описать то, что осталось после неё, если смотреть без лишней сентиментальности.",
  "В конце концов, {ending}. {happiness} — это то, что видно, если смотреть на всю жизнь целиком, а не выхватывать из неё отдельные куски.",
  "Конец пришёл так: {ending}. Оглядываясь назад — {happiness}. Что ж, в истории бывало и хуже, и это тоже кое-что значит.",
  "{ending}. Таков финал. {happiness} — и в этом есть своя правда, если не торопиться с выводами и не требовать от жизни того, чего она не обещала.",
  "Итог: {ending}. {happiness} — именно так, без лишнего пафоса и без лишней скромности, можно описать то, чем в действительности была эта жизнь."
];

function fmt(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function buildNarrative(fields, seed) {
  const s1 = fmt(pick(BEAT_OPENING,    seed + 20), fields);
  const s2 = fmt(pick(BEAT_CHARACTER,  seed + 21), fields);
  const s3 = fmt(pick(BEAT_FAMILY,     seed + 22), fields);
  const s4 = fmt(pick(BEAT_EVENT,      seed + 23), fields);
  const s5 = fmt(pick(BEAT_ENDING,     seed + 24), fields);
  return `${s1} ${s2} ${s3} ${s4} ${s5}`;
}

export function generateLife(profile, lifeNumber) {
  const seedBase = hashText(
    `${profile.birthDate}|${profile.city}|${profile.name || "anon"}|${lifeNumber}`
  );

  const profileBirthYear = getProfileBirthYear(profile.birthDate);
  const lifeSpan = 34 + (seedBase % 42);
  const yearsStepBack = 10 + (seedBase % 18);
  const extraOffset = seedBase % 6;
  let deathYear = profileBirthYear - lifeNumber * yearsStepBack - extraOffset;
  let birthYear = deathYear - lifeSpan;
  let role = pick(ROLES, seedBase + 3);
  const region = pick(REGIONS, seedBase + 2);
  const namePool = lifeNumber === 1
    ? NAMES_MODERN
    : (NAMES_BY_REGION[region] ?? NAMES_HISTORICAL);
  let name = pick(namePool, seedBase + 9);

  let era, eraIdx;
  if (lifeNumber === 1) {
    deathYear = Math.min(deathYear, profileBirthYear - 1);
    if (deathYear > 1999) deathYear = 1999;
    birthYear = deathYear - lifeSpan;
    era = "XX век";
    eraIdx = null;
    role = pick(MODERN_20TH_CENTURY_ROLES, seedBase + 3);
  } else {
    ({ era, eraIdx } = pickEraByYear(birthYear, seedBase + 1));
  }

  const trait    = pick(TRAITS,         seedBase + 4);
  const family   = pick(FAMILY_LINES,   seedBase + 5);
  const event    = pick(KEY_EVENTS,     seedBase + 6);
  const ending   = pick(ENDINGS,        seedBase + 7);
  const happiness = pick(HAPPINESS,     seedBase + 8);

  // Склонённые формы: индексы совпадают с базовыми массивами
  const regionIdx = (seedBase + 2) % REGIONS.length;
  const region_prep = REGIONS_PREP[regionIdx];

  let era_gen, era_prep;
  if (lifeNumber === 1) {
    era_gen  = "XX века";
    era_prep = "XX веке";
  } else {
    era_gen  = ERAS_GEN[eraIdx];
    era_prep = ERAS_PREP[eraIdx];
  }

  let role_instr, role_gen;
  if (lifeNumber === 1) {
    const roleIdx = (seedBase + 3) % MODERN_20TH_CENTURY_ROLES.length;
    role_instr = MODERN_20TH_CENTURY_ROLES_INSTR[roleIdx];
    role_gen   = MODERN_20TH_CENTURY_ROLES_GEN[roleIdx];
  } else {
    const roleIdx = (seedBase + 3) % ROLES.length;
    role_instr = ROLES_INSTR[roleIdx];
    role_gen   = ROLES_GEN[roleIdx];
  }

  const story = buildNarrative(
    { name, era, era_gen, era_prep, region, region_prep, role, role_instr, role_gen, trait, family, event, ending, happiness },
    seedBase
  );

  return {
    lifeNumber,
    name,
    birthYear,
    deathYear,
    lifeSpan,
    era,
    region,
    role,
    story,
    years: `${birthYear} — ${deathYear}`
  };
}
