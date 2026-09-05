// Harbor manga source: مانجا العاشق / 3asq
const BASE = "https://3asq.online";

async function getText(path, opts = {}) {
  const res = await harbor.http(BASE + path, { responseType: "text", ...opts });
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + path);
  return res.body || "";
}

function docOf(html) {
  return harbor.parseHtml(html);
}

function abs(url) {
  if (!url) return undefined;
  url = String(url).trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE + url;
  return BASE + "/" + url;
}

function seriesId(href) {
  const m = (href || "").match(/\/manga\/([^/?#]+)/);
  return m ? m[1] : null;
}

function chapterId(href) {
  const m = (href || "").match(/\/manga\/([^/?#]+\/[^/?#]+)/);
  return m ? m[1] : null;
}

function cover(el) {
  if (!el) return undefined;
  return abs(el.attr("data-src") || el.attr("data-lazy-src") || el.attr("src"));
}

function card(el) {
  const a =
    el.querySelector('.post-title a[href*="/manga/"]') ||
    el.querySelector('a[href*="/manga/"]');
  if (!a) return null;
  const id = seriesId(a.attr("href"));
  if (!id) return null;
  return {
    id,
    title: (a.text() || "").trim() || id,
    cover: cover(el.querySelector(".item-thumb img") || el.querySelector("img")),
  };
}

async function ajaxChapters(id) {
  const url = BASE + "/manga/" + id + "/ajax/chapters/";
  const shapes = [
    {
      method: "POST",
      body: "",
      responseType: "text",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
    { method: "POST", body: "", responseType: "text" },
  ];

  for (const opts of shapes) {
    try {
      const res = await harbor.http(url, opts);
      if (res && res.ok && res.body) return docOf(res.body);
    } catch (_) {}
  }
  return null;
}

function parseChapterDoc(doc) {
  if (!doc) return [];
  return doc.querySelectorAll("li.wp-manga-chapter").map((li) => {
    const a = li.querySelector("a");
    if (!a) return null;
    const href = a.attr("href");
    const id = chapterId(href);
    if (!id) return null;

    const raw = (a.text() || "").trim();
    const m = raw.match(/(\d+(?:\.\d+)?)/);
    const dateNode = li.querySelector(".chapter-release-date a");
    const relNode = li.querySelector(".chapter-release-date .timediff");

    return {
      id,
      chapter: m ? m[1] : raw,
      title: raw,
      volume: null,
      pages: 0,
      language: "ar",
      publishAt:
        dateNode?.attr("title")?.trim() ||
        relNode?.text()?.trim() ||
        undefined,
    };
  }).filter(Boolean);
}

const plugin = {
  id: "3asq-ar",
  name: "مانجا العاشق (العربية)",
  version: "1.3.0",

  async popular(offset = 0, tagId) {
    const page = Math.floor(Number(offset || 0) / 21) + 1;
    const path = tagId
      ? "/manga-genre/" + tagId + (page > 1 ? "/page/" + page + "/" : "/")
      : (page > 1 ? "/manga/page/" + page + "/" : "/manga/") + "?m_orderby=latest";

    const doc = docOf(await getText(path));
    return doc.querySelectorAll(".page-item-detail").map(card).filter(Boolean);
  },

  async search(query, offset = 0) {
    const page = Math.floor(Number(offset || 0) / 21) + 1;
    const path =
      (page > 1 ? "/page/" + page + "/" : "/") +
      "?s=" + encodeURIComponent(query) +
      "&post_type=wp-manga";

    const doc = docOf(await getText(path));
    return doc.querySelectorAll(".c-tabs-item__content").map((el) => {
      const a =
        el.querySelector('.post-title a[href*="/manga/"]') ||
        el.querySelector('.tab-thumb a[href*="/manga/"]') ||
        el.querySelector('a[href*="/manga/"]');
      if (!a) return null;
      const id = seriesId(a.attr("href"));
      if (!id) return null;
      return {
        id,
        title: (a.text() || "").trim() || id,
        cover: cover(el.querySelector("img")),
      };
    }).filter(Boolean);
  },

  async detail(id) {
    const doc = docOf(await getText("/manga/" + id + "/"));
    const h1 = doc.querySelector(".post-title h1") || doc.querySelector("h1");
    const row = (label) => {
      let out;
      doc.querySelectorAll(".post-content_item").forEach((r) => {
        if (out) return;
        const h = r.querySelector(".summary-heading");
        const c = r.querySelector(".summary-content");
        if (h && c && h.text().includes(label)) out = c.text().trim();
      });
      return out;
    };

    return {
      id,
      title: (h1?.text() || id).trim(),
      cover: cover(doc.querySelector(".summary_image img")),
      description:
        (
          doc.querySelector(".description-summary .summary__content") ||
          doc.querySelector(".summary__content") ||
          doc.querySelector(".manga-excerpt")
        )?.text()?.trim(),
      author: row("الكاتب"),
      status: row("الحالة"),
    };
  },

  async chapters(id) {
    const ajax = await ajaxChapters(id);
    const fromAjax = parseChapterDoc(ajax);
    if (fromAjax.length) return fromAjax;

    const doc = docOf(await getText("/manga/" + id + "/"));
    return parseChapterDoc(doc);
  },

  async pageUrls(id) {
    const doc = docOf(await getText("/manga/" + id + "/"));
    return doc
      .querySelectorAll(".reading-content img")
      .map((img) => abs(img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src")))
      .filter(Boolean);
  },
};

return plugin;
