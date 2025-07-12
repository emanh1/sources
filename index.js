import * as cheerio from "cheerio";
import AbortController from "abort-controller";
import FormData from "form-data";
class NotFoundError extends Error {
  constructor(reason) {
    super(`Couldn't find a source: ${reason ?? "not found"}`);
    this.name = "NotFoundError";
  }
}
const flags = {
  CORS_ALLOWED: "cors-allowed",
  // HTML not available through cheerio
  DYNAMIC_RENDER: "dynamic-render",
  NEEDS_REFERER_HEADER: "needs-referer-header"
};
const targets = {
  BROWSER: "browser",
  NATIVE: "native",
  ANY: "any"
};
const targetToFeatures = {
  browser: {
    requires: [flags.CORS_ALLOWED],
    disallowed: []
  },
  native: {
    requires: [],
    disallowed: []
  },
  any: {
    requires: [],
    disallowed: []
  }
};
function getTargetFeatures(target) {
  const features = targetToFeatures[target];
  return features;
}
function flagsAllowedInFeatures(features, inputFlags) {
  const hasAllFlags = features.requires.every((v) => inputFlags.includes(v));
  if (!hasAllFlags) return false;
  const hasDisallowedFlag = features.disallowed.some((v) => inputFlags.includes(v));
  if (hasDisallowedFlag) return false;
  return true;
}
const baseUrl$4 = "https://www.mangaread.org/";
async function fetchChapters$4(ctx) {
  const url = `${baseUrl$4}manga/${toSnakeCase$3(ctx.manga.title)}/`;
  const response = await ctx.proxiedFetcher(url);
  const $ = cheerio.load(response);
  const chapters = getChapters$2($);
  return chapters;
}
function getChapters$2($) {
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
function toSnakeCase$3(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function fetchPages$3(ctx) {
  const response = await ctx.proxiedFetcher(ctx.chapter.url);
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
      chapter: ctx.chapter
    });
  });
  pages.sort((a, b) => a.id - b.id);
  return pages;
}
const mangaReadScraper = {
  id: "mangaread",
  name: "MangaRead",
  url: baseUrl$4,
  rank: 1,
  flags: [flags.CORS_ALLOWED],
  scrapeChapters: fetchChapters$4,
  scrapePagesofChapter: fetchPages$3
};
const baseUrl$3 = "https://api.mangadex.org";
async function fetchChapters$3(ctx) {
  const search = await ctx.fetcher("/manga", {
    baseUrl: baseUrl$3,
    query: {
      title: ctx.manga.title
    }
  });
  const chapterId = search.data[0].id;
  const chaptersResponse = await ctx.fetcher(`/manga/${chapterId}/feed`, {
    baseUrl: baseUrl$3
  });
  const chapters = chaptersResponse.data.filter((ch) => !ctx.language || ch.attributes.translatedLanguage === ctx.language).map((ch) => ({
    id: ch.id,
    chapterNumber: Number(ch.attributes.chapter),
    chapterTitle: ch.attributes.title,
    chapterVolume: Number(ch.attributes.volume),
    date: ch.attributes.publishAt,
    url: `${baseUrl$3}/at-home/server/${ch.id}`,
    sourceId: "mangadex"
  }));
  console.log(chapters);
  return chapters;
}
async function fetchPages$2(ctx) {
  const res = await ctx.fetcher(ctx.chapter.url);
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
  url: baseUrl$3,
  rank: 4,
  flags: [flags.CORS_ALLOWED],
  scrapeChapters: fetchChapters$3,
  scrapePagesofChapter: fetchPages$2
};
const baseUrl$2 = "https://manhuabuddy.com";
async function fetchChapters$2(ctx) {
  const url = `${baseUrl$2}/manhwa/${toSnakeCase$2(ctx.manga.title)}/`;
  const response = await ctx.proxiedFetcher(url);
  const $ = cheerio.load(response);
  const chapters = getChapters$1($);
  return chapters;
}
function getChapters$1($) {
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
      url: baseUrl$2 + "/" + url,
      sourceId: "manhuabuddy"
    };
  }).filter(Boolean);
}
function toSnakeCase$2(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function fetchPages$1(ctx) {
  const response = await ctx.proxiedFetcher(ctx.chapter.url);
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
      chapter: ctx.chapter
    });
  });
  return pages;
}
const manhuaBuddyScraper = {
  id: "manhuabuddy",
  name: "ManhuaBuddy",
  url: baseUrl$2,
  rank: 3,
  flags: [flags.CORS_ALLOWED],
  scrapeChapters: fetchChapters$2,
  scrapePagesofChapter: fetchPages$1
};
const baseUrl$1 = "https://manganato.io";
async function fetchChapters$1(ctx) {
  const url = `${baseUrl$1}/manga/${toSnakeCase$1(ctx.manga.title)}`;
  const response = await ctx.proxiedFetcher(url, {
    headers: { "x-use-browser": "true" }
  });
  const $ = cheerio.load(response);
  const chapters = getChapters($);
  return chapters;
}
function getChapters($) {
  const chapterItems = $("li.wp-manga-chapter ").toArray();
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
      sourceId: "manganato"
    };
  }).filter(Boolean);
}
function toSnakeCase$1(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function fetchPages(ctx) {
  const response = await ctx.proxiedFetcher(ctx.chapter.url);
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
      chapter: ctx.chapter
    });
  });
  pages.sort((a, b) => a.id - b.id);
  return pages;
}
const manganatoScraper = {
  id: "manganato",
  name: "Manganato",
  url: baseUrl$1,
  rank: 2,
  flags: [flags.DYNAMIC_RENDER, flags.CORS_ALLOWED],
  scrapeChapters: fetchChapters$1,
  scrapePagesofChapter: fetchPages
};
const baseUrl = "https://fanfox.net";
function toSnakeCase(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
async function fetchChapters(ctx) {
  const url = `${baseUrl}/manga/${toSnakeCase(ctx.manga.title)}/`;
  const response = await ctx.proxiedFetcher(url);
  const $ = cheerio.load(response);
  const chapters = parseChapters($);
  return chapters;
}
function parseChapters($) {
  const container = $("#chapterlist");
  let links = [];
  if (container.find("#list-2 ul.detail-main-list").length) {
    links = container.find("#list-2 ul.detail-main-list li a").toArray();
  } else if (container.find("#list-1 ul.detail-main-list").length) {
    links = container.find("#list-1 ul.detail-main-list li a").toArray();
  } else {
    links = container.find(".detail-main-list ul li a").toArray();
  }
  return links.flatMap((el) => {
    const $el = $(el);
    const href = $el.attr("href");
    if (!href) return [];
    const chapterId = href.split("/").pop() || "";
    const title = $el.find(".title3").text().trim();
    const date = $el.find(".title2").text().trim();
    const match = title.match(/Ch\.(\d+(\.\d+)?)/i) || title.match(/c(\d+(\.\d+)?)/i);
    const number = match ? parseFloat(match[1]) : void 0;
    if (number === void 0) return [];
    return [{
      id: Number(chapterId),
      chapterNumber: number,
      date,
      url: baseUrl + href,
      sourceId: "fanfox"
    }];
  });
}
async function getPages(ctx) {
  const response = await ctx.proxiedFetcher(ctx.chapter.url, {
    headers: {
      "x-use-browser": "true"
    }
  });
  const $ = cheerio.load(response);
  const pages = [];
  const pageLinks = $(".pager-list-left span a[data-page]");
  let maxPage = 1;
  pageLinks.each((_, el) => {
    const n = parseInt($(el).attr("data-page") || "", 10);
    if (!isNaN(n)) maxPage = Math.max(maxPage, n);
  });
  for (let i = 1; i <= maxPage; i++) {
    const pageUrl = ctx.chapter.url.replace(/(\d+)\.html/, `${i}.html`);
    let pageData = await ctx.proxiedFetcher(pageUrl, {
      headers: {
        "x-use-browser": "true"
      }
    });
    let $$ = cheerio.load(pageData);
    let imgEl = $$(".reader-main-img");
    let imgUrl = imgEl.attr("src") || "";
    if (imgUrl.startsWith("//")) {
      imgUrl = "https:" + imgUrl;
    } else if (imgUrl.startsWith("/")) {
      imgUrl = baseUrl + imgUrl;
    }
    if (imgUrl && !imgUrl.toLowerCase().includes("loading")) {
      pages.push({
        id: i - 1,
        url: imgUrl,
        chapter: ctx.chapter
      });
    }
  }
  return pages;
}
const fanFoxScraper = {
  id: "fanfox",
  name: "FanFox (MangaFox)",
  url: baseUrl,
  rank: 100,
  flags: [flags.CORS_ALLOWED, flags.DYNAMIC_RENDER, flags.NEEDS_REFERER_HEADER],
  scrapeChapters: fetchChapters,
  scrapePagesofChapter: getPages
};
function gatherAllSources() {
  return [
    mangaReadScraper,
    mangaDexScraper,
    manhuaBuddyScraper,
    manganatoScraper,
    fanFoxScraper
  ].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}
function hasDuplicates(values) {
  return new Set(values).size !== values.length;
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
async function runAllSourcesForChapters(sources, ops) {
  const results = {};
  const contextBase = {
    fetcher: ops.fetcher,
    proxiedFetcher: ops.proxiedFetcher
  };
  for (const src of sources) {
    try {
      results[src.id] = await src.scrapeChapters({
        ...contextBase,
        manga: ops.manga
      });
    } catch (err) {
      console.warn(`Error scraping chapters from ${src.id}:`, err);
    }
  }
  return results;
}
async function runSourceForChapters(sources, ops) {
  const contextBase = {
    fetcher: ops.fetcher,
    proxiedFetcher: ops.proxiedFetcher
  };
  const source = sources.find((s) => s.id === ops.id);
  if (!source) {
    throw new Error(`Source with id ${ops.id} not found`);
  }
  try {
    const chapters = await source.scrapeChapters({
      ...contextBase,
      manga: ops.manga
    });
    return chapters;
  } catch (error) {
    throw error;
  }
}
async function fetchPagesFromSource(sources, ops) {
  const contextBase = {
    fetcher: ops.fetcher,
    proxiedFetcher: ops.proxiedFetcher
  };
  const src = sources.find((s) => s.id === ops.chapter.sourceId);
  if (!src) {
    throw new Error(`Source ${ops.chapter.sourceId} not found.`);
  }
  return src.scrapePagesofChapter({
    ...contextBase,
    chapter: ops.chapter,
    sourceId: ops.chapter.sourceId
  });
}
function getSources(features, list) {
  const sources = list.filter((v) => !(v == null ? void 0 : v.disabled));
  const anyDuplicateId = hasDuplicates(sources.map((v) => v.id));
  const anyDuplicateRank = hasDuplicates(sources.map((v) => v.rank));
  if (anyDuplicateId) throw new Error("Duplicate id found in sources");
  if (anyDuplicateRank) throw new Error("Duplicate rank found in sources");
  return sources.filter((s) => flagsAllowedInFeatures(features, s.flags));
}
function makeSources(ops) {
  const features = getTargetFeatures(ops.target);
  const sources = [...gatherAllSources()];
  const list = getSources(features, sources);
  const fetcherOps = {
    fetcher: makeFetcher(ops.fetcher),
    proxiedFetcher: makeFetcher(ops.proxiedFetcher ?? ops.fetcher),
    features
  };
  return {
    runAll(runnerOps) {
      return runAllSourcesForChapters(list, {
        ...fetcherOps,
        ...runnerOps
      });
    },
    runSourceForChapters(runnerOps) {
      return runSourceForChapters(list, {
        ...fetcherOps,
        ...runnerOps
      });
    },
    runSourceForPages(runnerOps) {
      return fetchPagesFromSource(list, {
        ...fetcherOps,
        ...runnerOps
      });
    },
    listSources() {
      return list;
    }
  };
}
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
export {
  NotFoundError,
  flags,
  gatherAllSources,
  getSources,
  makeFetcher,
  makeSimpleProxyFetcher,
  makeSources,
  makeStandardFetcher,
  targets
};
