// ПРАВИЛО СКЛОНЕНИЙ: каждый массив контента имеет параллельные массивы для нужных падежей.
// Порядок элементов должен строго совпадать. При добавлении новой записи — добавлять
// соответствующие формы во все связанные массивы (_PREP, _GEN, _INSTR).
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_ANCIENT,
  CITIES_BY_REGION,
  LIFE_ACHIEVEMENTS_DISPLAY,
  PSYCHOLOGICAL_TYPES,
  ENDINGS,
  ERAS,
  ERAS_GEN,
  ERAS_PREP,
  FAMOUS_CONNECTIONS,
  FAMOUS_CONNECTIONS_ANCIENT,
  FAMILY_LINES,
  GRANDEUR_OPENERS,
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
  SELF_DISCOVERY,
  SETTLEMENTS,
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
  "Родился в {city}, {region}, в {era_prep}. Рос в небогатой семье, с детства привык к тому, что еда не появляется сама собой и соседи бывают разные.",
  "{city}, {region}. {era}. {name} появился на свет в год, когда в городе сменился наместник и подорожал хлеб — два события, которые местные жители связали между собой и, возможно, были правы.",
  "Выходец из {region_gen}. Родился в {era_prep}, в {city}, в семье со скромными средствами и твёрдыми представлениями о том, как должен вести себя порядочный человек.",
  "{name} происходил из {region_gen}. Детство и юность прошли в {city} в {era_prep}. Местность не располагала к праздности: климат суровый, торговля нерегулярная, власти менялись чаще, чем успевали освоиться.",
  "Уроженец {city}, {region}. Жил в {era_prep}. О его происхождении известно немного — семья не принадлежала ни к знатным, ни к совсем бедным, что в те времена означало умение держаться тихо и работать без жалоб.",
  "Родился и вырос в {city}. {era} застал его в возрасте, когда человек уже замечает, что происходит вокруг, но ещё не умеет от этого спрятаться.",
  "{city}, {region_prep}, {era}. {name} родился третьим ребёнком в семье, что тогда означало: двое старших уже знают, что делать, а ты разберёшься сам.",
  "Происходил из {region_gen}. Детские годы провёл в {city} в {era_prep}. По семейным записям — если таковые и существовали — человек практического склада, с ранних лет приученный к работе.",
  "Рождён в {city}, {region}. {era} — время, когда город переживал не лучший период: дороги разбиты, торговля вялая, люди осторожны в словах. {name} вырос именно в этой осторожности.",
  "{name} родился в {era_prep} в {city}. Семья держалась за {region} несколько поколений — не из любви к месту, а за неимением другого. Это тоже своего рода корни.",
  "Уроженец {region_gen}, {city}. Период рождения — {era}. Ни особых привилегий, ни особых лишений: судьба тех, кто начинает с середины и должен всё остальное заработать самостоятельно.",
  "Жил в {era_prep}. Родина — {city}, {region}. По всем признакам — человек из тех, кого не замечают на улице, но хорошо помнят те, кто однажды попросил о помощи."
];

const BEAT_CHARACTER = [
  "По профессии — {role}. {trait}. Окружающие это замечали: одни ценили, другие обходили стороной — что в целом говорит о человеке больше, чем любая официальная характеристика.",
  "Работал {role_instr}. Был известен как человек, который делает дело и не объясняет зачем. {trait} — это его описывали те, кто знал его по работе.",
  "{name} числился {role_instr}. Профессия не блестящая, но надёжная — в {era_prep} такое ценилось. {trait}.",
  "Избрал занятие {role_gen}. Это не было случайностью: семья, связи, обстоятельства — всё указывало в одну сторону. {trait}: свойство, полезное именно в этом деле.",
  "Был известен в округе как {role}. {trait}. С ним советовались по делу и избегали пустых разговоров — что вполне соответствовало его характеру.",
  "Всю зрелую жизнь проработал {role_instr}. {trait}. Те, кто сотрудничал с ним по делам, отзывались кратко: надёжен, немногословен, слова своего не нарушает.",
  "Профессия — {role}. {name} занимался этим делом большую часть жизни и приобрёл в нём репутацию человека точного и без лишних претензий. {trait}.",
  "В {era_prep} {role_instr} быть — значило знать много такого, о чём лучше молчать. {name} молчал исправно. {trait}.",
  "{name} был {role_instr}. Работал с той особой тщательностью людей, которые знают: больше никто не придёт. {trait} — это качество делало его незаменимым и при этом не очень удобным в компании.",
  "Работал {role_instr}. Профессия не из тех, что приносят известность, — зато из тех, что дают постоянный доход и понимание, как устроены люди. {trait}.",
  "Известен как {role}. {trait}. В узком кругу его ценили именно за это; в широком — просто знали, что он есть и что к нему можно обратиться.",
  "Провёл большую часть жизни {role_instr}. {trait}. Умер как жил — аккуратно и без лишних объяснений. Дела были закончены."
];

const BEAT_FAMILY = [
  "Семейное положение: {family}. В {era_prep} это был вполне обычный расклад — хотя любой обычный расклад изнутри выглядит иначе, чем снаружи.",
  "Личная жизнь: {family}. По меркам времени — ни исключительно хорошо, ни исключительно плохо. Просто жизнь, которую проживают не для отчёта.",
  "{family}. Детей знал поимённо, помнил дни рождения, не злоупотреблял отсутствием — что в ту эпоху само по себе характеристика.",
  "В личном — {family}. Домашние дела вёл аккуратно, в дрязги не вступал, неудобных разговоров не искал. Соседи считали его человеком правильным.",
  "Семья: {family}. С этим жил ровно, без публичных жалоб. Что происходило за закрытой дверью — осталось там же.",
  "{family}. Близкие отзывались о нём сдержанно-положительно, что на языке родственников означает: характер был, но держал его при себе.",
  "По семейной части: {family}. Дом содержал в порядке. На вопросы о личном отвечал коротко или не отвечал вовсе — и то и другое воспринималось одинаково.",
  "Семейные обстоятельства: {family}. {name} не говорил о них много. В {era_prep} это было нормой: публичное — публично, остальное — дома.",
  "{family} — такова была домашняя история. Не украшена и не скрыта. Те, кто знал близко, понимали, что за этим стоит; остальным незачем было знать.",
  "В доме — {family}. Справлялся без лишнего шума. Кто жил рядом — тот знал, что он за человек; кто не жил — тому можно было не объяснять.",
  "Личная история коротко: {family}. Этот фундамент держался незаметно — как держатся все вещи, которые делаются не напоказ.",
  "Семья: {family}. Всё, что за этим стоит — заботы, потери, мелкие радости, — осталось внутри. Наружу выходила только работа."
];

const BEAT_EVENT = [
  "Ключевое событие в биографии: {event}. После этого жизнь пошла по другому пути — не потому что он так решил, а потому что обстоятельства не оставили другого варианта.",
  "Главное, что произошло: {event}. Это не стало темой для разговоров, но изменило многое — в том, как принимал решения и кому доверял.",
  "В зрелые годы: {event}. Обошлось. Но след остался — в привычках, в осторожности, в том, как с тех пор держался подальше от похожих ситуаций.",
  "Поворотный момент: {event}. Это стоило дорого — не в деньгах, в другом. Впоследствии не жалел, что это случилось, хотя предпочёл бы иначе.",
  "{event}. Случилось в {era_prep}, когда подобное было не редкостью. {name} справился — молча, без посторонней помощи, что само по себе характеристика.",
  "Среди событий жизни выделяется одно: {event}. Не самое шумное, но самое долгосрочное по последствиям — из тех, что не объявляют о себе заранее.",
  "{event}. {name} потом редко упоминал об этом. Те, кто знал его достаточно долго, замечали разницу в характере — до и после.",
  "В один из периодов: {event}. Для {era_gen} это было типично. Для конкретного человека типичные события бывают нетипичными по весу.",
  "Из всего, что происходило, особо выделяется: {event}. Это потребовало времени и ресурсов, которых тогда было мало. Справился тем не менее.",
  "{event}. Произошло не в самый удачный момент — хотя удачных моментов для такого обычно и не бывает. Вышел из этого изменённым, но не сломленным.",
  "Биографически важный эпизод: {event}. После него {name} приобрёл репутацию человека, который держится, когда другие не держатся.",
  "{event} — событие, которое в {era_prep} происходило с людьми его положения нередко. Редкостью было то, что он из этого извлёк и как это применил."
];

const BEAT_ENDING = [
  "{ending}. {happiness}. Итог жизни, если подводить его без пафоса — именно такой.",
  "Скончался: {ending}. {happiness}. По меркам {era_gen} — биография вполне законченная.",
  "{ending}. После осталось немногое: {happiness}. Остальное разошлось по людям и предметам, которые его уже не помнили.",
  "Конец жизни: {ending}. {happiness}. Бывало хуже. Бывало лучше. Это была именно эта жизнь.",
  "{ending} в {era_prep}, в {region_prep}. {happiness} — единственная оценка, которая что-то значит.",
  "Умер: {ending}. {happiness}. Те, кто его знал, проводили по-разному: одни с сожалением, другие с облегчением, что само по себе свидетельство прожитого.",
  "Финал: {ending}. Никто не выбирает, как именно. {happiness} — вот что осталось после.",
  "{ending}. {happiness}. Дела, которые были закончены, остались закончены. Дела, которые не были — тоже остались.",
  "Умер как жил: {ending}. {happiness}. Это не похвала и не осуждение — просто факт.",
  "{ending}. {happiness}. В {region_prep} таких людей хоронили без лишнего шума и помнили дольше, чем казалось.",
  "Последнее, что известно: {ending}. {happiness}. После этого — тишина, которую в биографиях принято называть финалом.",
  "{ending}. {happiness}. Жизнь была прожита от начала до конца — что в {era_prep} было не так просто, как кажется."
];

function fmt(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function feminizeText(text, name) {
  // Unicode-совместимые границы слов (кириллица не входит в \w, \b не работает)
  const L = '(?<![а-яёА-ЯЁa-zA-Z])';
  const R = '(?![а-яёА-ЯЁa-zA-Z])';
  const r = (from, to) => {
    text = text.replace(new RegExp(`${L}${from}${R}`, 'gi'), (match) => {
      const firstUp = match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase();
      return firstUp ? to[0].toUpperCase() + to.slice(1) : to;
    });
  };

  // Местоимения и причастия
  const pronounPairs = [
    ['родившийся', 'родившаяся'],
    ['выросший', 'выросшая'],
    ['рождённый', 'рождённая'],
    ['него', 'неё'],
    ['нему', 'ней'],
    ['ним', 'ней'],
    ['ему', 'ей'],
    ['его', 'её'],
    ['он', 'она'],
  ];
  for (const [m, f] of pronounPairs) {
    r(m, f);
  }

  // Глаголы после "она" (результат замены "он"→"она")
  const onaPairs = [
    ['она был', 'она была'],
    ['она жил', 'она жила'],
    ['она знал', 'она знала'],
    ['она умел', 'она умела'],
    ['она делал', 'она делала'],
    ['она говорил', 'она говорила'],
    ['она спорил', 'она спорила'],
    ['она держал', 'она держала'],
    ['она стал', 'она стала'],
    ['она мог', 'она могла'],
    ['она остался', 'она осталась'],
    ['она появился', 'она появилась'],
    ['она родился', 'она родилась'],
    ['она справился', 'она справилась'],
    ['она вернулся', 'она вернулась'],
    ['она оказался', 'она оказалась'],
    ['она понял', 'она поняла'],
    ['она принял', 'она приняла'],
    ['она выбрал', 'она выбрала'],
    ['она обладал', 'она обладала'],
    ['она решил', 'она решила'],
    ['она оставил', 'она оставила'],
    ['она закрыл', 'она закрыла'],
    ['она обдумывал', 'она обдумывала'],
    ['она считал', 'она считала'],
  ];
  for (const [m, f] of onaPairs) {
    text = text.replace(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      (match) => match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
        ? f[0].toUpperCase() + f.slice(1) : f
    );
  }

  // Одиночные глаголы субъекта
  r('уроженец', 'уроженка');
  r('выходец', 'уроженка');
  r('происходил', 'происходила');
  r('рождён', 'рождена');
  r('родился', 'родилась');
  r('числился', 'числилась');
  r('избрал', 'избрала');
  r('провёл', 'провела');
  r('проработал', 'проработала');
  r('надёжен', 'надёжна');
  r('немногословен', 'немногословна');
  r('приучен', 'приучена');
  r('известен', 'известна');
  r('умел', 'умела');
  r('не спорил', 'не спорила');
  r('не говорил', 'не говорила');
  r('работал', 'работала');
  r('молчал', 'молчала');
  r('занимался', 'занималась');
  r('приобрёл', 'приобрела');

  // Глаголы смерти
  const deathPairs = [
    ['умер', 'умерла'],
    ['погиб', 'погибла'],
    ['скончался', 'скончалась'],
    ['угас', 'угасла'],
    ['покончил', 'покончила'],
    ['утонул', 'утонула'],
  ];
  for (const [m, f] of deathPairs) {
    r(m, f);
  }

  // Согласование
  text = text.replace(/она была одним из них/g, 'она была одной из них');
  text = text.replace(/была именно таким/g, 'была именно такой');

  // Глаголы после имени
  const nameEsc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameVerbPairs = [
    ['был', 'была'],
    ['жил', 'жила'],
    ['знал', 'знала'],
    ['оставил', 'оставила'],
    ['остался', 'осталась'],
    ['закрыл', 'закрыла'],
    ['выбрал', 'выбрала'],
    ['появился', 'появилась'],
  ];
  for (const [m, f] of nameVerbPairs) {
    text = text.replace(
      new RegExp(`(${nameEsc}(?:[^.!?,]{0,40}?)?)(?<![а-яёА-ЯЁa-zA-Z])${m}(?![а-яёА-ЯЁa-zA-Z])`, 'g'),
      (match, prefix) => prefix + f
    );
  }

  return text;
}

function buildNarrative(fields, seed, extras) {
  const openingPool = extras.useGrandeur ? GRANDEUR_OPENERS : BEAT_OPENING;
  const s1 = fmt(pick(openingPool,     seed + 20), fields);
  const s2 = fmt(pick(BEAT_CHARACTER,  seed + 21), fields);
  const s3 = fmt(pick(BEAT_FAMILY,     seed + 22), fields);
  const s4 = fmt(pick(BEAT_EVENT,      seed + 23), fields);
  const s5 = fmt(pick(BEAT_ENDING,     seed + 24), fields);
  const conn = extras.connection ? ` ${fmt(extras.connection, fields)}` : "";
  const ach  = extras.achievement ? ` ${fmt(extras.achievement, fields)}` : "";
  return `${s1} ${s2}${conn} ${s3}${ach} ${s4} ${s5}`;
}

export function generateLife(profile, lifeNumber) {
  const seedBase = hashText(
    `${profile.birthDate}|${profile.city}|${profile.name || "anon"}|${lifeNumber}`
  );

  const profileBirthYear = getProfileBirthYear(profile.birthDate);
  const lifeSpan = 34 + (seedBase % 42);
  const yearsStepBack = 95 + (seedBase % 25); // ~100 лет на жизнь → жизнь #10 ≈ 10 веков назад
  const extraOffset = seedBase % 6;
  let deathYear = profileBirthYear - lifeNumber * yearsStepBack - extraOffset;
  let birthYear = deathYear - lifeSpan;
  let role = pick(ROLES, seedBase + 3);

  // Определяем эпоху первой, чтобы ограничить выбор региона
  let era, eraIdx;
  if (lifeNumber === 1) {
    deathYear = Math.min(deathYear, profileBirthYear - 1);
    if (deathYear > 1999) deathYear = 1999;
    if (deathYear < 1900) deathYear = 1900 + ((seedBase + 7) % 55); // держим в XX веке
    birthYear = deathYear - lifeSpan;
    era = "XX век";
    eraIdx = null;
    role = pick(MODERN_20TH_CENTURY_ROLES, seedBase + 3);
  } else {
    ({ era, eraIdx } = pickEraByYear(birthYear, seedBase + 1));
  }

  // ERA_REGION_CONSTRAINTS: азиатские эпохи → только ближневосточные/центральноазиатские регионы
  const ASIAN_ERA_IDX   = new Set([15, 18, 19]); // Ханьская, Феодальная Япония, Эпоха Мин
  const EASTERN_ERA_IDX = new Set([9, 16]);       // Османская эпоха, Арабский золотой век
  let regionPool;
  if (eraIdx !== null && ASIAN_ERA_IDX.has(eraIdx)) {
    regionPool = [4, 8, 10, 11]; // Каспийский, Месопотамия, Анатолия, Персидский
  } else if (eraIdx !== null && EASTERN_ERA_IDX.has(eraIdx)) {
    regionPool = [4, 5, 7, 8, 10, 11]; // + Левант, Нил
  } else {
    regionPool = null; // все регионы
  }
  const region = regionPool
    ? REGIONS[regionPool[(seedBase + 2) % regionPool.length]]
    : pick(REGIONS, seedBase + 2);

  const namePool = lifeNumber === 1
    ? NAMES_MODERN
    : (NAMES_BY_REGION[region] ?? NAMES_HISTORICAL);
  let name = pick(namePool, seedBase + 9);

  // Определяем пол по позиции имени в массиве (первые 15 — мужские, 15–24 — женские)
  let isFemale;
  if (lifeNumber === 1) {
    isFemale = /[аяАЯ]$/.test(name.trim());
  } else {
    const rPool = NAMES_BY_REGION[region];
    if (rPool) {
      isFemale = (seedBase + 9) % rPool.length >= 15;
    } else {
      isFemale = /[аяАЯ]$/.test(name.trim());
    }
  }

  const settlement = pick(SETTLEMENTS,  seedBase + 25);
  const selfDiscoveryCount = 1 + (seedBase % 3);
  const selfDiscovery = Array.from({ length: selfDiscoveryCount }, (_, i) =>
    pick(SELF_DISCOVERY, seedBase + 30 + i * 13)
  );

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

  // Для мужских персонажей заменяем явно женские роли
  if (!isFemale) {
    if (role === "акушерка и целительница") {
      role = "лекарь и знахарь";
      role_gen = "лекаря и знахаря";
      role_instr = "лекарем и знахарем";
    }
    if (role === "медсестра в военном госпитале") {
      role = "санитар в военном госпитале";
      role_gen = "санитара в военном госпитале";
      role_instr = "санитаром в военном госпитале";
    }
  }

  const useGrandeur   = (seedBase + 40) % 3 === 0;
  const useConnection = (seedBase + 41) % 3 === 0;
  const useAchievement = (seedBase + 42) % 3 === 0;

  const isModern = birthYear >= 1700;
  const connPool = isModern ? FAMOUS_CONNECTIONS : FAMOUS_CONNECTIONS_ANCIENT;
  const achPool  = isModern ? ACHIEVEMENTS : ACHIEVEMENTS_ANCIENT;

  const connection  = useConnection  ? pick(connPool, seedBase + 50) : null;
  const achievement = useAchievement ? pick(achPool,  seedBase + 51) : null;

  const regionGenIdx = (seedBase + 2) % REGIONS.length;
  const region_gen = REGIONS_PREP[regionGenIdx];

  const cityPool = CITIES_BY_REGION[region] ?? ["городе"];
  const city = pick(cityPool, seedBase + 26);
  const psychType = pick(PSYCHOLOGICAL_TYPES, seedBase + 60);
  const achievementDisplay = pick(LIFE_ACHIEVEMENTS_DISPLAY, seedBase + 61);

  let story = buildNarrative(
    { name, era, era_gen, era_prep, region, region_prep, region_gen, role, role_instr, role_gen, trait, family, event, ending, happiness, city },
    seedBase,
    { useGrandeur, connection, achievement }
  );

  if (isFemale) {
    story = feminizeText(story, name);
  }

  return {
    lifeNumber,
    name,
    birthYear,
    deathYear,
    lifeSpan,
    era,
    region,
    city,
    role,
    story,
    settlement,
    selfDiscovery,
    psychType,
    achievementDisplay,
    isFemale,
    years: `${birthYear} — ${deathYear}`
  };
}

// ── Всратые жизни ───────────────────────────────────

const ABSURD_BEINGS = [
  {
    role: "гусь",
    era: "Деревенская Россия",
    region: "Тульская губерния",
    city: "деревня Малые Ковши",
    nameOptions: ["Гусь", "Борька", "Серый"],
    lifeSpanYears: 8,
    image: "an aggressive proud goose in a Russian village, watercolor folk art illustration, white goose, funny expression",
    story: `Прожил восемь лет в деревне Малые Ковши. Основным занятием было перекрывать дорогу к колодцу и орать на всех проходящих без разбора. Слыл среди местных птиц существом глубокомысленным — в частности, полагал, что смысл жизни заключается в том, чтобы занять максимум пространства при минимуме оснований. Пятеро гусят. Скончался в апреле от несварения после неудачного знакомства с содержимым компостной кучи. Деревня не расстроилась, но колодец с тех пор посещала с осторожностью — по инерции.`,
    selfDiscovery: ["Территория — это не место. Это состояние духа.", "Крик — недооценённый инструмент коммуникации."],
    psychType: { type: "Территориальный мыслитель", description: "Знал своё место. И чужое тоже. И ещё три на всякий случай." },
    achievementDisplay: "Успешно отогнал восемь человек от собственного колодца за один день. Рекорд деревни.",
    happiness: "жизнь оценивается как насыщенная — особенно первые пять лет"
  },
  {
    role: "бомж",
    era: "Постсоветская эпоха",
    region: "Москва",
    city: "Павелецкий вокзал",
    nameOptions: ["Геннадий", "Николаич", "Петрович"],
    lifeSpanYears: 58,
    image: "a wise elderly homeless man sitting at a train station, warm realistic portrait, thoughtful eyes, soft lighting",
    story: `Геннадий Николаевич имел высшее техническое образование, квартиру и должность инженера-конструктора, однако к сорока двум годам выяснилось, что ни одно из перечисленного не обязательно. Следующие шестнадцать лет провёл преимущественно на Павелецком вокзале, где выработал целостную философию о природе собственности, смысле транзитных пространств и правильном выборе лавочки. Обладал способностью безошибочно угадывать, кто из пассажиров даст закурить, — это был его единственный верифицируемый дар. Умер семидесяти лет, полностью свободным от имущественных обязательств.`,
    selfDiscovery: ["Вокзал — честнейшее место на земле. Все куда-то едут, никто не притворяется, что остаётся.", "Квартира — это просто лавочка с отоплением."],
    psychType: { type: "Свободный философ", description: "Освободился от всего лишнего. Правда, вместе с необходимым." },
    achievementDisplay: "16 лет на Павелецком. Знал расписание всех поездов наизусть, хотя никуда не ехал.",
    happiness: "жизнь оценивается противоречиво: внешне небогатая, внутренне — по-своему завершённая"
  },
  {
    role: "инопланетянин",
    era: "Разведывательная миссия, XX век",
    region: "Земля (временно)",
    city: "Воронеж",
    nameOptions: ["Зн'квэ", "Бртллг", "Хрм"],
    lifeSpanYears: 3,
    image: "a confused alien tourist in a Soviet city, humorous retro illustration, green alien in a trenchcoat, 1980s style",
    story: `Прибыл для изучения доминирующего вида планеты. Провёл три года в Воронеже, после чего подал рапорт об эвакуации. В отчёте для командования указал, что вид разумен в теории, однако на практике большую часть времени проводит в очередях за продуктами, которые сам же и произвёл. Особо отметил феномен «понедельника» как день коллективного психологического кризиса. Рекомендовал отложить контакт примерно на тысячу лет или до тех пор, пока вид не разберётся с парковкой. Улетел в ноябре 1989 года, прихватив авоську как сувенир.`,
    selfDiscovery: ["Ни одна цивилизация во Вселенной не делает очереди намеренно. Кроме одной.", "Понедельник — межпланетный феномен."],
    psychType: { type: "Разочарованный наблюдатель", description: "Прилетел с надеждой. Улетел с авоськой." },
    achievementDisplay: "Составил наиболее точный внешний отчёт о советском быте. Засекречен на родной планете как психологически опасный.",
    happiness: "жизнь оценивается как поучительная, хотя и не в том смысле, в котором планировалось"
  },
  {
    role: "опарыш",
    era: "Лето 1743 года",
    region: "Европа",
    city: "окрестности Кёнигсберга",
    nameOptions: ["Личинка №3419", "Опарыш", "Малыш"],
    lifeSpanYears: 0,
    image: "a microscopic world view, abstract colorful biological illustration, tiny larva, bright colors, scientific art style",
    story: `Прожил одиннадцать дней в условиях, которые для большинства форм жизни показались бы неприемлемыми, однако лично его вполне устраивали. За это время успел пройти полный жизненный цикл, осуществить профессиональное призвание, не отвлекаясь на рефлексию, и внести вклад в экосистему, который трудно переоценить, хотя обычно именно это с ним и делают. Никаких сожалений. Никаких незавершённых дел. Исключительная фокусировка на задаче. Превратился в муху в среду.`,
    selfDiscovery: ["Одиннадцать дней — вполне достаточный срок для полноценной жизни.", "Незавершённые дела — это для тех, у кого есть завтра."],
    psychType: { type: "Абсолютный реалист", description: "Не ставил долгосрочных целей. По уважительной причине." },
    achievementDisplay: "Завершил все жизненные задачи в установленный срок. Без исключений.",
    happiness: "жизнь оценивается как эффективная: ноль незавершённых дел"
  },
  {
    role: "ленточный червь",
    era: "Эпоха крестовых походов",
    region: "Ближний Восток",
    city: "кишечник рыцаря Готфрида фон Штауфена",
    nameOptions: ["Плоский", "Длинный", "Червь"],
    lifeSpanYears: 12,
    image: "a medieval illuminated manuscript page, whimsical illustration of a knight with a tiny worm character, colorful medieval art",
    story: `Двенадцать лет провёл внутри рыцаря Готфрида фон Штауфена, участника Третьего крестового похода. Имел уникальный доступ к историческим событиям, хотя и строго изнутри. Был свидетелем осады Акры, битвы при Арсуфе и заключения перемирия с Саладином — обо всём этом узнал исключительно по изменению рациона хозяина. Тем не менее сформировал собственное мнение о ходе истории: войны определяются логистикой снабжения, и это он знал лучше кого-либо. Хозяин скончался в 1194 году в Германии. Последовал за ним.`,
    selfDiscovery: ["История делается желудком, а не мечом.", "Стабильность — высшая из добродетелей."],
    psychType: { type: "Внутренний хроникёр", description: "Наблюдал историю с наилучшей возможной позиции. Никому не рассказал." },
    achievementDisplay: "12 лет непрерывного существования в условиях активного крестового похода. Статистически маловероятно.",
    happiness: "жизнь оценивается как стабильная и насыщенная событиями чужой биографии"
  },
  {
    role: "куст смородины",
    era: "Советская эпоха",
    region: "Подмосковье",
    city: "дача №47, СНТ «Рассвет»",
    nameOptions: ["Куст у забора", "Смородина", "Чёрный куст"],
    lifeSpanYears: 47,
    image: "a detailed illustration of a currant bush in a Soviet dacha garden, watercolor style, summer afternoon, nostalgic mood",
    story: `Сорок семь лет простоял у западного забора дачи №47 в садовом товариществе «Рассвет». За это время сменилось четыре поколения семьи Кузнецовых, две политические системы, три кота и бесчисленное количество мнений о правильном способе подвязки. Ежегодно производил смородину, которую частично собирали, частично оставляли птицам, частично просто давили ногой при прополке. На замечания не реагировал. Два раза чуть не вырубили — оба раза передумали. Засох в 2011 году тихо и без претензий к окружающим.`,
    selfDiscovery: ["Присутствие — это тоже вклад.", "Тех, кто стоит на месте, замечают не сразу. Но запоминают."],
    psychType: { type: "Молчаливый свидетель", description: "Видел всё. Не сказал ничего. Возможно, это и был вклад." },
    achievementDisplay: "47 лет на одном месте. Пережил советский период, перестройку и трёх котов.",
    happiness: "жизнь оценивается как тихая, последовательная и по-своему завершённая"
  }
];

export function shouldBeAbsurd(profile, lifeNumber, existingLives) {
  if (lifeNumber < 2 || lifeNumber > 4) return false;
  const seed = hashText(`${profile.birthDate}|${profile.name || "anon"}|absurd`);
  if (lifeNumber === 2) return seed % 2 === 0;
  if (lifeNumber === 3) {
    if (existingLives[1]?.isAbsurd) return false;
    return (seed + 1) % 2 === 0;
  }
  if (lifeNumber === 4) {
    const l2 = existingLives[1]?.isAbsurd ?? false;
    const l3 = existingLives[2]?.isAbsurd ?? false;
    return !l2 && !l3;
  }
  return false;
}

export function generateAbsurdLife(profile, lifeNumber) {
  const seed = hashText(`${profile.birthDate}|${profile.city}|${profile.name || "anon"}|${lifeNumber}|absurd`);
  const being = ABSURD_BEINGS[seed % ABSURD_BEINGS.length];
  const name = being.nameOptions[(seed + 1) % being.nameOptions.length];

  const profileBirthYear = getProfileBirthYear(profile.birthDate);
  const baseYear = profileBirthYear - lifeNumber * 95 - (seed % 30);
  const deathYear = baseYear;
  const birthYear = deathYear - being.lifeSpanYears;

  const yearsLabel = being.lifeSpanYears === 0
    ? `${deathYear} (11 дней)`
    : `${birthYear} — ${deathYear}`;

  return {
    lifeNumber,
    name,
    birthYear,
    deathYear,
    lifeSpan: being.lifeSpanYears,
    era: being.era,
    region: being.region,
    city: being.city,
    role: being.role,
    story: being.story,
    settlement: null,
    selfDiscovery: being.selfDiscovery,
    psychType: being.psychType,
    achievementDisplay: being.achievementDisplay,
    isFemale: false,
    isAbsurd: true,
    absurdImage: being.image,
    years: yearsLabel,
    happiness: being.happiness,
  };
}
