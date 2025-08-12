import { flags } from "@/entrypoint/targets"
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from "./base"
import type { ChapterContext, MangaContext, SearchContext } from "@/utils/context"
import * as cheerio from 'cheerio'
import type { Chapter, Manga, Page } from "@/utils/types"

const baseUrl = 'https://mangahasu.me'

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const url = baseUrl + '/advanced-search.html?keyword=' + ctx.titleInput;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);
    const mangas: Manga[] = [];

    $("ul.list_manga > li").each((_, li) => {
        const el = $(li);

        const mangaAnchor = el.find(".info-manga > a.name-manga");
        const url = mangaAnchor.attr("href") ?? "";

        const title = mangaAnchor.find("h3").text().trim();

        const coverUrl = el.find(".wrapper_imgage a > img").attr("src");

        if (title && url) {
            mangas.push({
                sourceId: 'mangahasu',
                title,
                url,
                coverUrl,
            });
        }
    });

    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(response);
    const chapters: Chapter[] = [];

    $("div.list-chapter table tbody tr").each((_, tr) => {
        const el = $(tr);
        const anchor = el.find("td.name a");

        if (!anchor.length) return;

        const url = anchor.attr("href") ?? "";
        const fullText = anchor.text().trim();

        const mangaName = anchor.find("span.name-manga").text().trim();

        const chapterTitleRaw = fullText.startsWith(mangaName)
            ? fullText.slice(mangaName.length).trim()
            : fullText;

        const chapterNumberMatch = chapterTitleRaw.match(/Chapter\s+([\d.]+)/i);
        const chapterNumber = chapterNumberMatch ? chapterNumberMatch[1].trim() : null;

        const date = el.find("td.date-updated").text().trim() || undefined;

        const idMatch = url.match(/-c(\d+)\.html/);
        const id = idMatch ? idMatch[1] : '';

        chapters.push({
            id,
            sourceId: 'mangahasu',
            url,
            title: chapterTitleRaw || null,
            chapterNumber,
            date,
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);
    const pages: Page[] = [];

    $("div.img-chapter#loadchapter div.img img").each((i, el) => {
        const img = $(el);
        const url = img.attr("data-src") ?? img.attr("src") ?? "";
        if (url) {
            pages.push({
                id: i,
                url,
            });
        }
    });

    return pages;
}

export const mangaHasuScraper: Source = {
    id: 'mangahasu',
    name: 'MangaHasu',
    url: baseUrl,
    rank: 27,
    flags: [flags.CORS_ALLOWED, flags.NEEDS_REFERER_HEADER],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages,
}