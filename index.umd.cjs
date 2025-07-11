(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("cheerio"), require("abort-controller"), require("form-data")) : typeof define === "function" && define.amd ? define(["exports", "cheerio", "abort-controller", "form-data"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.index = {}, global.cheerio, global["abort-controller"], global["form-data"]));
})(this, function(exports2, cheerio, AbortController, FormData) {
  "use strict";
  function _interopNamespaceDefault(e) {
    const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
    if (e) {
      for (const k in e) {
        if (k !== "default") {
          const d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: () => e[k]
          });
        }
      }
    }
    n.default = e;
    return Object.freeze(n);
  }
  const cheerio__namespace = /* @__PURE__ */ _interopNamespaceDefault(cheerio);
  class NotFoundError extends Error {
    constructor(reason) {
      super(`Couldn't find a source: ${reason ?? "not found"}`);
      this.name = "NotFoundError";
    }
  }
  const flags = {
    CORS_ALLOWED: "cors-allowed",
    // HTML not available through cheerio
    DYNAMIC_RENDER: "dynamic-render"
  };
  const targets = {
    BROWSER: "browser",
    NATIVE: "native",
    ANY: "any"
  };
  const targetToFeatures = {
    browser: {
      requires: [flags.CORS_ALLOWED],
      disallowed: [flags.DYNAMIC_RENDER]
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
  const baseUrl$3 = "https://www.mangaread.org/";
  async function fetchChapters$3(ctx) {
    const url = `${baseUrl$3}manga/${toSnakeCase$2(ctx.manga.title)}/`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio__namespace.load(response);
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
  function toSnakeCase$2(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  async function fetchPages$3(ctx) {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio__namespace.load(response);
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
    url: baseUrl$3,
    rank: 1,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters$3,
    scrapePagesofChapter: fetchPages$3
  };
  const baseUrl$2 = "https://api.mangadex.org";
  async function fetchChapters$2(ctx) {
    const search = await ctx.fetcher("/manga", {
      baseUrl: baseUrl$2,
      query: {
        title: ctx.manga.title
      }
    });
    const chapterId = search.data[0].id;
    const chaptersResponse = await ctx.fetcher(`/manga/${chapterId}/feed`, {
      baseUrl: baseUrl$2
    });
    const chapters = chaptersResponse.data.filter((ch) => !ctx.language || ch.attributes.translatedLanguage === ctx.language).map((ch) => ({
      id: ch.id,
      chapterNumber: Number(ch.attributes.chapter),
      chapterTitle: ch.attributes.title,
      chapterVolume: Number(ch.attributes.volume),
      date: ch.attributes.publishAt,
      url: `${baseUrl$2}/at-home/server/${ch.id}`,
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
    url: baseUrl$2,
    rank: 4,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters$2,
    scrapePagesofChapter: fetchPages$2
  };
  const baseUrl$1 = "https://manhuabuddy.com";
  async function fetchChapters$1(ctx) {
    const url = `${baseUrl$1}/manhwa/${toSnakeCase$1(ctx.manga.title)}/`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio__namespace.load(response);
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
        url: baseUrl$1 + "/" + url,
        sourceId: "manhuabuddy"
      };
    }).filter(Boolean);
  }
  function toSnakeCase$1(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  async function fetchPages$1(ctx) {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio__namespace.load(response);
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
    url: baseUrl$1,
    rank: 3,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters$1,
    scrapePagesofChapter: fetchPages$1
  };
  const baseUrl = "https://manganato.io";
  async function fetchChapters(ctx) {
    const url = `${baseUrl}/manga/${toSnakeCase(ctx.manga.title)}`;
    const response = await ctx.proxiedFetcher(url, {
      headers: { "x-use-browser": "true" }
    });
    const $ = cheerio__namespace.load(response);
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
  function toSnakeCase(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  async function fetchPages(ctx) {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio__namespace.load(response);
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
    url: baseUrl,
    rank: 2,
    flags: [flags.DYNAMIC_RENDER, flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
  };
  function gatherAllSources() {
    return [
      mangaReadScraper,
      mangaDexScraper,
      manhuaBuddyScraper,
      manganatoScraper
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
  exports2.NotFoundError = NotFoundError;
  exports2.flags = flags;
  exports2.gatherAllSources = gatherAllSources;
  exports2.getSources = getSources;
  exports2.makeFetcher = makeFetcher;
  exports2.makeSimpleProxyFetcher = makeSimpleProxyFetcher;
  exports2.makeSources = makeSources;
  exports2.makeStandardFetcher = makeStandardFetcher;
  exports2.targets = targets;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
