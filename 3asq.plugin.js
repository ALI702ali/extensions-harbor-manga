const BASE = "https://3asq.online";

async function getDoc(path) {
  const res = await harbor.http(BASE + path, { 
    headers: { "Referer": BASE + "/" },
    responseType: "text" 
  });
  if (!res.ok) throw new Error("http " + res.status + " for " + path);
  return harbor.parseHtml(res.body);
}

function abs(url) {
  if (!url) return undefined;
  url = url.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return BASE + url;
  return BASE + "/" + url;
}

function parseCard(el) {
  const link = el.querySelector(".post-title a") || el.querySelector(".item-thumb a");
  const img = el.querySelector("img");
  if (!link) return null;
  
  const href = link.attr("href") || "";
  const match = href.match(/\/manga\/([^\/]+)/);
  const id = match ? match[1] : href.replace(/\/$/, "").split("/").pop();

  return {
    id: id,
    title: (link.text() || link.attr("title") || "").trim(),
    cover: abs(img?.attr("data-src") || img?.attr("data-lazy-src") || img?.attr("src")),
  };
}

const plugin = {
  id: "3asq-online",
  name: "3asq",

  async popular(offset, tagId) {
    const page = Math.floor(offset / 18) + 1;
    const path = page === 1 ? "/manga/?m_orderby=views" : "/manga/page/" + page + "/?m_orderby=views";
    const doc = await getDoc(path);
    const items = doc.querySelectorAll(".page-item-detail, .c-tabs-item__content");
    return items.map(parseCard).filter(Boolean);
  },

  async search(query, offset, tagId) {
    const page = Math.floor(offset / 18) + 1;
    const path = "/page/" + page + "/?s=" + encodeURIComponent(query) + "&post_type=wp-manga";
    const doc = await getDoc(path);
    const items = doc.querySelectorAll(".c-tabs-item__content, .page-item-detail");
    return items.map(parseCard).filter(Boolean);
  },

  async detail(id) {
    const doc = await getDoc("/manga/" + id + "/");
    const summary = doc.querySelector(".tab-summary");
    if (!summary && !doc.querySelector(".post-title")) return null;

    const title = doc.querySelector(".post-title h1")?.text()?.trim() || id;
    const cover = abs(
      doc.querySelector(".summary_image img")?.attr("data-src") || 
      doc.querySelector(".summary_image img")?.attr("src")
    );
    const description = doc.querySelector(".description-summary")?.text()?.trim() || "";
    const author = doc.querySelector(".author-content a")?.text()?.trim();
    const status = doc.querySelector(".post-status .summary-content")?.text()?.trim();

    return {
      id,
      title,
      cover,
      description,
      status,
      author,
    };
  },

  async chapters(id) {
    let doc = await getDoc("/manga/" + id + "/");
    let elements = doc.querySelectorAll("li.wp-manga-chapter a");

    // في حال تحميل الفصول عبر AJAX
    if (!elements || elements.length === 0) {
      try {
        const res = await harbor.http(BASE + "/manga/" + id + "/ajax/chapters/", {
          method: "POST",
          responseType: "text"
        });
        if (res.ok && res.body) {
          const ajaxDoc = harbor.parseHtml(res.body);
          elements = ajaxDoc.querySelectorAll("li.wp-manga-chapter a");
        }
      } catch (e) {}
    }

    return (elements || [])
      .map((a) => {
        const href = a.attr("href") || "";
        const cleanPath = href.replace(/^https?:\/\/[^\/]+\//, "").replace(/\/$/, "");
        if (!cleanPath) return null;

        const titleText = a.text()?.trim() || "";
        const matchNum = titleText.match(/(\d+(\.\d+)?)/);

        return {
          id: cleanPath,
          chapter: matchNum ? matchNum[1] : null,
          title: titleText,
          volume: null,
          pages: 0,
          language: "ar",
        };
      })
      .filter((c) => c && c.id);
  },

  async pageUrls(chapterId) {
    const doc = await getDoc("/" + chapterId + "/");
    const images = doc.querySelectorAll(".reading-content img, .page-break img");
    
    return images
      .map((img) => abs(img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src")))
      .filter((url) => Boolean(url) && !url.includes("loading"));
  },
};
