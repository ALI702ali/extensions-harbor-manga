const API_BASE = "https://api.mangadex.org";
const COVER_BASE = "https://uploads.mangadex.org/covers";
const HEADERS = { "User-Agent": "HarborApp/1.0" };

function extractCover(manga) {
  const rel = manga.relationships?.find((r) => r.type === "cover_art");
  const fileName = rel?.attributes?.fileName;
  return fileName ? `${COVER_BASE}/${manga.id}/${fileName}.256.jpg` : undefined;
}

function extractTitle(manga) {
  const titles = manga.attributes?.title || {};
  return titles.en || titles["ja-ro"] || Object.values(titles)[0] || manga.id;
}

const plugin = {
  id: "mangadex-org",
  name: "MangaDex",

  async popular(offset) {
    const data = await harbor.http(
      `${API_BASE}/manga?limit=32&offset=${offset}&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`,
      { headers: HEADERS, responseType: "json" }
    );
    if (!data || !Array.isArray(data.data)) return [];
    return data.data.map((m) => ({
      id: m.id,
      title: extractTitle(m),
      cover: extractCover(m),
    }));
  },

  async search(query, offset) {
    const data = await harbor.http(
      `${API_BASE}/manga?title=${encodeURIComponent(query)}&limit=32&offset=${offset}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`,
      { headers: HEADERS, responseType: "json" }
    );
    if (!data || !Array.isArray(data.data)) return [];
    return data.data.map((m) => ({
      id: m.id,
      title: extractTitle(m),
      cover: extractCover(m),
    }));
  },

  async detail(id) {
    const res = await harbor.http(
      `${API_BASE}/manga/${id}?includes[]=cover_art&includes[]=author`,
      { headers: HEADERS, responseType: "json" }
    );
    if (!res || !res.data) return null;
    const m = res.data;
    const authorRel = m.relationships?.find((r) => r.type === "author");

    return {
      id: m.id,
      title: extractTitle(m),
      cover: extractCover(m),
      description: m.attributes?.description?.en || Object.values(m.attributes?.description || {})[0] || "",
      status: m.attributes?.status,
      author: authorRel?.attributes?.name,
    };
  },

  async chapters(id) {
    const res = await harbor.http(
      `${API_BASE}/manga/${id}/feed?limit=100&order[chapter]=desc&translatedLanguage[]=en&translatedLanguage[]=ar&contentRating[]=safe&contentRating[]=suggestive`,
      { headers: HEADERS, responseType: "json" }
    );
    if (!res || !Array.isArray(res.data)) return [];
    return res.data.map((ch) => ({
      id: ch.id,
      chapter: ch.attributes?.chapter || null,
      title: ch.attributes?.title || (ch.attributes?.chapter ? `Chapter ${ch.attributes.chapter}` : "Chapter"),
      volume: ch.attributes?.volume || null,
      pages: ch.attributes?.pages || 0,
      language: ch.attributes?.translatedLanguage || "en",
      publishAt: ch.attributes?.publishAt || undefined,
    }));
  },

  async pageUrls(chapterId) {
    const res = await harbor.http(`${API_BASE}/at-home/server/${chapterId}`, {
      headers: HEADERS,
      responseType: "json",
    });
    if (!res || !res.chapter?.data || !res.baseUrl) return [];
    const base = res.baseUrl;
    const hash = res.chapter.hash;
    return res.chapter.data.map((file) => `${base}/data/${hash}/${file}`);
  },
};
