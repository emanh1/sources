import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://mangapark.net";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const searchUrl = `${baseUrl}/search?word=${encodeURIComponent(ctx.manga.title)}`;
    const searchHtml = await ctx.proxiedFetcher(searchUrl, {
        headers: {
            'x-use-browser': 'true'
        }
    });
    const $search = cheerio.load(searchHtml);

    const firstResult = $search('a.link-hover.link-pri').first();
    const mangaHref = firstResult.attr('href');

    if (!mangaHref) throw new Error("No manga found for title: " + ctx.manga.title);

    const mangaUrl = mangaHref.startsWith('http') ? mangaHref : `${baseUrl}${mangaHref}`;
    const mangaHtml = await ctx.proxiedFetcher(mangaUrl);
    const $ = cheerio.load(mangaHtml);

    const chapters: Chapter[] = [];

    $('a.link-hover.link-primary').each((_, el) => {
        const href = $(el).attr('href')?.trim();
        const title = $(el).text().trim();

        if (!href || !title) return;

        const match = title.match(/Chapter\s*(\d+(?:\.\d+)?)/i) || href.match(/\/(\d+(?:\.\d+)?)-/);
        const chapterNumber = match ? parseFloat(match[1]) : undefined;

        if (chapterNumber === undefined) return;

        chapters.push({
            id: chapterNumber,
            chapterNumber,
            chapterTitle: title,
            url: href.startsWith('http') ? href : `${baseUrl}${href}`,
            sourceId: 'mangapark'
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url, {
        headers: {
            'x-use-browser': 'true'
        }
    });
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('img.w-full.h-full').each((i, img) => {
        const src = $(img).attr('src')?.trim();
        if (!src) return;
        if (!src.startsWith("http")) return;
        pages.push({
            id: i,
            url: src,
            chapter: ctx.chapter
        });
    });

    return pages;
}
///SLOW!
export const mangaparkScraper: Source = {
    id: 'mangapark',
    name: 'MangaPark',
    url: baseUrl,
    rank: 13,
    flags: [flags.CORS_ALLOWED, flags.DYNAMIC_RENDER, flags.NEEDS_REFERER_HEADER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};

