import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const source = path.join(root, "connect");
const output = path.join(root, "connect-next/src/content/pages.json");

const files = [
  "index.html", "about.html", "contact.html", "teachers.html", "articles.html",
  "teacher-buddha.html", "teacher-osho.html", "teacher-rumi.html",
  "teacher-socrates.html", "teacher-plato.html", "teacher-spinoza.html",
  "teacher-guru-nanak.html", "teacher-kabir.html",
  "teacher-adi-shankaracharya.html", "teacher-vivekananda.html",
  "article-what-is-parmatma.html", "article-self-realization.html",
  "article-life-purpose.html", "article-meditation-techniques.html",
];

const teachers = [
  ["buddha", "Buddha", "c. 6th century BCE", "A simple guide to his life, awakening and core wisdom on the path within.", "sarnath-buddha-statue.jpg"],
  ["osho", "Osho", "1931 – 1990", "Blunt honesty, humour and the most talked-about meditation method of the 20th century.", "osho-rajneesh.jpg"],
  ["rumi", "Rumi", "1207 – 1273", "The poet who turned longing into light — a mirror for anyone beginning a meditation journey.", "mevlana-museum-konya.jpg"],
  ["socrates", "Socrates", "c. 470 – 399 BCE", "The father of Western philosophy, and the art of knowing yourself.", "socrates.jpg"],
  ["plato", "Plato", "c. 428 – 348 BCE", "The philosopher who turned inward to find truth that outlasts opinion.", "plato.jpg"],
  ["spinoza", "Baruch Spinoza", "1632 – 1677", "The philosopher who found God in Nature, and peace in clear thought.", "spinoza.jpg"],
  ["guru-nanak", "Guru Nanak", "1469 – 1539", "Founder of Sikhism, and a practical path to inner awakening for a busy household life.", "guru-nanak-dev.jpg"],
  ["kabir", "Kabir", "c. 1440 – 1518", "The weaver-poet who saw truth stripped of ritual and dogma.", "kabir.jpg"],
  ["adi-shankaracharya", "Adi Shankaracharya", "c. 788 – 820 CE", "India's foremost Advaita Vedanta philosopher — you are not separate from the truth you seek.", "adi-shankaracharya.jpg"],
  ["vivekananda", "Swami Vivekananda", "1863 – 1902", "The journey to self-realisation and inner awakening, for the questioning mind.", "swami-vivekananda.jpg"],
];

const articles = [
  ["what-is-parmatma", "What is Parmatma?", "A plain-English guide to what Parmatma means, and how different paths approach realising it.", "starry-night-sky-iss.jpg", "bi-brightness-high"],
  ["self-realization", "Self-Realisation", "Understand what self-realisation means, how to start gently, and the real benefits it brings.", "lotus-flower.jpg", "bi-eye"],
  ["life-purpose", "Finding Your Life Purpose", "Midlife is not a decline — it is a harvest season. A warm, honest way to find what your life is for.", "death-valley-sunrise-silhouette.jpg", "bi-compass"],
  ["meditation-techniques", "The Stillness Toolkit", "So many techniques on offer — this guide maps the whole territory so you can start today.", "buddha-meditating.jpg", "bi-flower3"],
];

function teacherCards(limit = teachers.length) {
  return teachers.slice(0, limit).map(([slug, name, era, description, image]) => `
    <div class="col-sm-6 col-lg-4 col-xl-3"><div class="puja-card">
      <div class="puja-media"><img src="/images/${image}" alt="${name}" loading="lazy"></div>
      <div class="puja-body"><div class="puja-cat">${era}</div><h3>${name}</h3><p>${description}</p>
      <div class="card-actions"><a href="/teachers/${slug}" class="btn btn-book" style="flex:1 1 100%">Read Guide</a></div></div>
    </div></div>`).join("");
}

function articleCards() {
  return articles.map(([slug, name, description, image, icon]) => `
    <div class="col-sm-6 col-lg-3"><div class="puja-card">
      <div class="puja-media"><img src="/images/${image}" alt="${name}" loading="lazy"><i class="bi ${icon} puja-media-icon"></i></div>
      <div class="puja-body"><div class="puja-cat">Pillar Guide</div><h3>${name}</h3><p>${description}</p>
      <div class="card-actions"><a href="/articles/${slug}" class="btn btn-book" style="flex:1 1 100%">Read Article</a></div></div>
    </div></div>`).join("");
}

function routeFor(file) {
  if (file === "index.html") return "/";
  if (file === "teachers.html") return "/teachers";
  if (file === "articles.html") return "/articles";
  if (file.startsWith("teacher-")) return `/teachers/${file.slice(8, -5)}`;
  if (file.startsWith("article-")) return `/articles/${file.slice(8, -5)}`;
  return `/${file.slice(0, -5)}`;
}

function cleanLinks(html) {
  return html
    .replaceAll('href="index.html"', 'href="/"')
    .replaceAll('href="teachers.html"', 'href="/teachers"')
    .replaceAll('href="articles.html"', 'href="/articles"')
    .replaceAll('href="about.html"', 'href="/about"')
    .replaceAll('href="contact.html"', 'href="/contact"')
    .replace(/href="teacher-([^"]+)\.html"/g, 'href="/teachers/$1"')
    .replace(/href="article-([^"]+)\.html"/g, 'href="/articles/$1"')
    .replace(/src="images\//g, 'src="/images/');
}

const pages = {};
for (const file of files) {
  const sourceHtml = await readFile(path.join(source, file), "utf8");
  const title = sourceHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "connect2infinity";
  const description = sourceHtml.match(/<meta name="description" content="([\s\S]*?)">/i)?.[1] ?? "";
  let html = sourceHtml.split("</nav>")[1]?.split("<footer")[0] ?? "";
  html = cleanLinks(html)
    .replace('<div class="row g-4" id="homeTeacherGrid"></div>', `<div class="row g-4">${teacherCards(6)}</div>`)
    .replace('<div class="row g-4" id="teacherGrid"></div>', `<div class="row g-4">${teacherCards()}</div>`)
    .replace('<div class="row g-4" id="homeArticleGrid"></div>', `<div class="row g-4">${articleCards()}</div>`)
    .replace('<div class="row g-4" id="articleGrid"></div>', `<div class="row g-4">${articleCards()}</div>`);
  pages[routeFor(file)] = { title, description, html };
}

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(pages, null, 2)}\n`, "utf8");
console.log(`Migrated ${Object.keys(pages).length} pages to ${output}`);
