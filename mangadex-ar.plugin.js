// Harbor manga source: MangaDex — Arabic chapters
const API = "https://api.mangadex.org";
const WEB = "https://mangadex.org";

async function api(path) {
  const res = await harbor.http(API + path, { responseType: "text" });
  if (!res.ok) throw new Error("MangaDex HTTP " + res.status + " for " + path);
  return JSON.parse(res.body || "{}");
}

function enc(s) {
  return encodeURIComponent(s);
}

function titleOf(m) {
  const t = m?.attributes?.title || {};
  return t.en || t.ar || Object.values(t)[0] || "Untitled";
}

function coverOf(m) {
  const rel = (m.relationships || []).find((r) => r.type === "cover_art");
  const file = rel?.attributes?.fileName;
  return file ? API + "/covers/" + m.id + "/" + file + ".512.jpg" : undefined;
}

function mangaSummary(m) {
  return {
    id: m.id,
    title: titleOf(m),
    cover: coverOf(m),
  };
}

async function mangaList(params) {
  const q = Object.entries(params)
    .flatMap(([k, v]) => Array.isArray(v) ? v.map(x => enc(k) + "=" + enc(x)) : [enc(k) + "=" + enc(v)])
    .join("&");
  const data = await api("/manga?" + q);
  return (data.data || []).map(mangaSummary);
}

const plugin = {
  id: "mangadex-ar",
  name: "MangaDex (العربية)",
  version: "1.0.0",

  async popular(offset = 0) {
    return mangaList({
      limit: 100,
      offset: Number(offset || 0),
      "includes[]": "cover_art",
      "availableTranslatedLanguage[]": "ar",
      "order[followedCount]": "desc",
    });
  },

  async search(query, offset = 0) {
    return mangaList({
      title: query,
      limit: 100,
      offset: Number(offset || 0),
      "includes[]": "cover_art",
      "availableTranslatedLanguage[]": "ar",
      "order[relevance]": "desc",
    });
  },

  async detail(id) {
    const data = await api(
      "/manga/" + enc(id) +
      "?includes[]=cover_art&includes[]=author&includes[]=artist"
    );
    const m = data.data;
    if (!m) throw new Error("Manga not found");
    return {
      id: m.id,
      title: titleOf(m),
      cover: coverOf(m),
      description: m.attributes?.description?.en ||
                   m.attributes?.description?.ar ||
                   Object.values(m.attributes?.description || {})[0],
      status: m.attributes?.status,
      author: (m.relationships || [])
        .filter((r) => r.type === "author" || r.type === "artist")
        .map((r) => r.attributes?.name)
        .filter(Boolean)
        .join(", "),
    };
  },

  async chapters(id) {
    const out = [];
    for (let offset = 0; ; offset += 500) {
      const q =
        "/manga/" + enc(id) + "/feed?" +
        "limit=500&offset=" + offset +
        "&order[chapter]=asc&order[volume]=asc" +
        "&translatedLanguage[]=ar" +
        "&includes[]=scanlation_group";

      const data = await api(q);
      const items = data.data || [];
      if (!items.length) break;

      for (const ch of items) {
        const a = ch.attributes || {};
        const chapter = a.chapter ?? a.title ?? "";
        const group = (ch.relationships || [])
          .find((r) => r.type === "scanlation_group")?.attributes?.name;

        out.push({
          id: ch.id,
          chapter: String(chapter),
          title: a.title || "",
          volume: a.volume ?? null,
          pages: a.pages ?? 0,
          language: "ar",
          publishAt: a.publishAt,
          group: group || undefined,
        });
        if (items.length < 500) break;
      }

      if (items.length < 500) break;
    }
    return out;
  },

  async pageUrls(chapterId) {
    const data = await api("/at-home/server/" + enc(chapterId));
    const base = data.baseUrl;
    const ch = data.chapter;
    if (!base || !ch) return [];

    return (ch.data || []).map((name) =>
      base + "/data/" + ch.hash + "/" + name
    );
  },
};

return plugin;
