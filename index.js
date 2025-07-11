import AbortController from "abort-controller";
import FormData from "form-data";
import * as cheerio from "cheerio";
const isReactNative = () => {
  try {
    require("react-native");
    return true;
  } catch (e) {
    return false;
  }
};
function serializeBody(body) {
  if (body === void 0 || typeof body === "string" || body instanceof URLSearchParams || body instanceof FormData) {
    if (body instanceof URLSearchParams && isReactNative()) {
      return {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      };
    }
    return {
      headers: {},
      body
    };
  }
  return {
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
function makeFullUrl(url, ops) {
  let leftSide = (ops == null ? void 0 : ops.baseUrl) ?? "";
  let rightSide = url;
  if (leftSide.length > 0 && !leftSide.endsWith("/")) leftSide += "/";
  if (rightSide.startsWith("/")) rightSide = rightSide.slice(1);
  const fullUrl = leftSide + rightSide;
  if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://") && !fullUrl.startsWith("data:"))
    throw new Error(`Invald URL -- URL doesn't start with a http scheme: '${fullUrl}'`);
  const parsedUrl = new URL(fullUrl);
  Object.entries((ops == null ? void 0 : ops.query) ?? {}).forEach(([k, v]) => {
    parsedUrl.searchParams.set(k, v);
  });
  return parsedUrl.toString();
}
function makeFetcher(fetcher) {
  const newFetcher = (url, ops) => {
    return fetcher(url, {
      headers: (ops == null ? void 0 : ops.headers) ?? {},
      method: (ops == null ? void 0 : ops.method) ?? "GET",
      query: (ops == null ? void 0 : ops.query) ?? {},
      baseUrl: (ops == null ? void 0 : ops.baseUrl) ?? "",
      readHeaders: (ops == null ? void 0 : ops.readHeaders) ?? [],
      body: ops == null ? void 0 : ops.body,
      credentials: ops == null ? void 0 : ops.credentials
    });
  };
  const output = async (url, ops) => (await newFetcher(url, ops)).body;
  output.full = newFetcher;
  return output;
}
function getHeaders(list, res) {
  const output = new Headers();
  list.forEach((header) => {
    var _a;
    const realHeader = header.toLowerCase();
    const realValue = res.headers.get(realHeader);
    const extraValue = (_a = res.extraHeaders) == null ? void 0 : _a.get(realHeader);
    const value = extraValue ?? realValue;
    if (!value) return;
    output.set(realHeader, value);
  });
  return output;
}
function makeStandardFetcher(f) {
  const normalFetch = async (url, ops) => {
    var _a;
    const fullUrl = makeFullUrl(url, ops);
    const seralizedBody = serializeBody(ops.body);
    const controller = new AbortController();
    const timeout = 15e3;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await f(fullUrl, {
        method: ops.method,
        headers: {
          ...seralizedBody.headers,
          ...ops.headers
        },
        body: seralizedBody.body,
        credentials: ops.credentials,
        signal: controller.signal
        // Pass the signal to fetch
      });
      clearTimeout(timeoutId);
      let body;
      const isJson = (_a = res.headers.get("content-type")) == null ? void 0 : _a.includes("application/json");
      if (isJson) body = await res.json();
      else body = await res.text();
      return {
        body,
        finalUrl: res.extraUrl ?? res.url,
        headers: getHeaders(ops.readHeaders, res),
        statusCode: res.status
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`Fetch request to ${fullUrl} timed out after ${timeout}ms`);
      }
      throw error;
    }
  };
  return normalFetch;
}
const headerMap = {
  cookie: "X-Cookie",
  referer: "X-Referer",
  origin: "X-Origin",
  "user-agent": "X-User-Agent",
  "x-real-ip": "X-X-Real-Ip"
};
const responseHeaderMap = {
  "x-set-cookie": "Set-Cookie"
};
function makeSimpleProxyFetcher(proxyUrl, f) {
  const proxiedFetch = async (url, ops) => {
    const fetcher = makeStandardFetcher(async (a, b) => {
      const controller = new AbortController();
      const timeout = 15e3;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const res = await f(a, {
          method: (b == null ? void 0 : b.method) || "GET",
          headers: (b == null ? void 0 : b.headers) || {},
          body: b == null ? void 0 : b.body,
          credentials: b == null ? void 0 : b.credentials,
          signal: controller.signal
          // Pass the signal to fetch
        });
        clearTimeout(timeoutId);
        res.extraHeaders = new Headers();
        Object.entries(responseHeaderMap).forEach((entry) => {
          var _a;
          const value = res.headers.get(entry[0]);
          if (!value) return;
          (_a = res.extraHeaders) == null ? void 0 : _a.set(entry[1].toLowerCase(), value);
        });
        res.extraUrl = res.headers.get("X-Final-Destination") ?? res.url;
        return res;
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error(`Fetch request to ${a} timed out after ${timeout}ms`);
        }
        throw error;
      }
    });
    const fullUrl = makeFullUrl(url, ops);
    const headerEntries = Object.entries(ops.headers).map((entry) => {
      const key = entry[0].toLowerCase();
      if (headerMap[key]) return [headerMap[key], entry[1]];
      return entry;
    });
    return fetcher(proxyUrl, {
      ...ops,
      query: {
        destination: fullUrl
      },
      headers: Object.fromEntries(headerEntries),
      baseUrl: void 0
    });
  };
  return proxiedFetch;
}
const baseUrl$2 = "https://www.mangaread.org/";
async function fetchChapters$2(manga) {
  const url = `${baseUrl$2}manga/${toSnakeCase$1(manga.title)}/`;
  const response = await manga.proxiedFetcher(url);
  const $ = cheerio.load(response);
  const chapters = getChapters$1($);
  return chapters;
}
function getChapters$1($) {
  const chapterItems = $("li.wp-manga-chapter").toArray();
  return chapterItems.map((li) => {
    const $li = $(li);
    const $a = $li.find("a");
    const url = $a.attr("href") || "";
    const titleText = $a.text().trim();
    const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
    const chapterNumber = match ? parseFloat(match[1]) : void 0;
    const date = $li.find(".chapter-release-date i").text().trim();
    if (!url || chapterNumber === void 0) return null;
    const parts = url.split("/").filter(Boolean);
    const chapterIdStr = parts[parts.length - 1];
    const chapterId = parseInt(chapterIdStr.replace(/[^\d]/g, ""), 10);
    return {
      id: chapterId,
      chapterNumber,
      date,
      url,
      sourceId: "mangaread"
    };
  }).filter(Boolean);
}
function toSnakeCase$1(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function fetchPages$2(chapter) {
  const response = await chapter.proxiedFetcher(chapter.url);
  const $ = cheerio.load(response);
  const pages = [];
  $("img.wp-manga-chapter-img").each((_, img) => {
    var _a;
    const $img = $(img);
    const src = ((_a = $img.attr("src")) == null ? void 0 : _a.trim()) || "";
    if (!src) return;
    const id = $img.attr("id") || "";
    const match = id.match(/image-(\d+)/);
    const pageNumber = match ? parseInt(match[1], 10) : pages.length;
    pages.push({
      id: pageNumber,
      url: src,
      chapter
    });
  });
  pages.sort((a, b) => a.id - b.id);
  return pages;
}
const mangaReadScraper = {
  id: "mangaread",
  name: "MangaRead",
  url: baseUrl$2,
  rank: 90,
  scrapeChapters: fetchChapters$2,
  scrapePagesofChapter: fetchPages$2
};
const baseUrl$1 = "https://api.mangadex.org";
async function fetchChapters$1(manga) {
  const search = await manga.fetcher("/manga", {
    baseUrl: baseUrl$1,
    query: {
      title: manga.title
    }
  });
  const chapterId = search.data[0].id;
  const chaptersResponse = await manga.fetcher(`/manga/${chapterId}/feed`, {
    baseUrl: baseUrl$1
  });
  const chapters = chaptersResponse.data.filter((ch) => !manga.language || ch.attributes.translatedLanguage === manga.language).map((ch) => ({
    id: ch.id,
    chapterNumber: Number(ch.attributes.chapter),
    chapterTitle: ch.attributes.title,
    chapterVolume: Number(ch.attributes.volume),
    date: ch.attributes.publishAt,
    url: `${baseUrl$1}/at-home/server/${ch.id}`,
    sourceId: "mangadex"
  }));
  console.log(chapters);
  return chapters;
}
async function fetchPages$1(chapter) {
  const res = await chapter.fetcher(chapter.url);
  const base = res.baseUrl;
  const hash = res.chapter.hash;
  const files = res.chapter.data;
  const pages = files.map((file, idx) => ({
    pageNumber: idx + 1,
    url: `${base}/data/${hash}/${file}`
  }));
  return pages;
}
const mangaDexScraper = {
  id: "mangadex",
  name: "MangaDex",
  url: baseUrl$1,
  rank: 50,
  scrapeChapters: fetchChapters$1,
  scrapePagesofChapter: fetchPages$1
};
const baseUrl = "https://manhuabuddy.com";
async function fetchChapters(manga) {
  const url = `${baseUrl}/manhwa/${toSnakeCase(manga.title)}/`;
  const response = await manga.proxiedFetcher(url);
  const $ = cheerio.load(response);
  const chapters = getChapters($);
  return chapters;
}
function getChapters($) {
  const chapterItems = $("li.citem").toArray();
  return chapterItems.map((li) => {
    const $li = $(li);
    const $a = $li.find("a");
    const url = $a.attr("href") || "";
    const titleText = $a.text().trim();
    const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
    const chapterNumber = match ? parseFloat(match[1]) : void 0;
    const date = $li.find(".time").text().trim();
    if (!url || chapterNumber === void 0) return null;
    const parts = url.split("/").filter(Boolean);
    const chapterIdStr = parts[parts.length - 1].replace(/[^\d]/g, "");
    const chapterId = parseInt(chapterIdStr, 10);
    return {
      id: chapterId,
      chapterNumber,
      date,
      url: baseUrl + "/" + url,
      sourceId: "manhuabuddy"
    };
  }).filter(Boolean);
}
function toSnakeCase(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function fetchPages(chapter) {
  const response = await chapter.proxiedFetcher(chapter.url);
  console.log(chapter.url);
  console.log(response);
  const $ = cheerio.load(response);
  const pages = [];
  $(".item-photo img").each((idx, img) => {
    var _a;
    const $img = $(img);
    const src = ((_a = $img.attr("src")) == null ? void 0 : _a.trim()) || "";
    if (!src) return;
    pages.push({
      id: idx + 1,
      url: src,
      chapter
    });
  });
  return pages;
}
const manhuaBuddyScraper = {
  id: "manhuabuddy",
  name: "ManhuaBuddy",
  url: baseUrl,
  rank: 91,
  scrapeChapters: fetchChapters,
  scrapePagesofChapter: fetchPages
};
function gatherAllSources() {
  return [
    mangaReadScraper,
    mangaDexScraper,
    manhuaBuddyScraper
  ].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}
async function runSourceForChapters(context, sourceId) {
  const sources = gatherAllSources();
  const source = sources.find((s) => s.id === sourceId);
  if (!source) {
    throw new Error(`Source with id ${sourceId} not found`);
  }
  try {
    const chapters = await source.scrapeChapters(context);
    return chapters;
  } catch (error) {
    throw error;
  }
}
async function runAllSourcesForChapters(context) {
  const sources = gatherAllSources();
  const results = {};
  for (const src of sources) {
    if (src.disabled) continue;
    try {
      results[src.id] = await src.scrapeChapters(context);
    } catch (err) {
      console.warn(`Error scraping chapters from ${src.id}:`, err);
    }
  }
  return results;
}
async function fetchPagesFromSource(chapterContext) {
  const sources = gatherAllSources();
  const src = sources.find((s) => s.id === chapterContext.sourceId);
  if (!src) {
    throw new Error(`Source ${chapterContext.sourceId} not found.`);
  }
  return src.scrapePagesofChapter(chapterContext);
}
export {
  fetchPagesFromSource,
  gatherAllSources,
  makeFetcher,
  makeSimpleProxyFetcher,
  makeStandardFetcher,
  runAllSourcesForChapters,
  runSourceForChapters
};
