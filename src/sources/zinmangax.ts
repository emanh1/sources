import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { NotFoundError } from '@/utils/errors';

const baseUrl = 'https://zinmangax.com';

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(ctx.manga.title)}`;
    const searchHtml = await ctx.proxiedFetcher(searchUrl);
    const $search = cheerio.load(searchHtml);

    // Find first manga result
    const firstAnchor = $search('a[href^="/manga/"]').first();
    const mangaHref = firstAnchor.attr('href');

    if (!mangaHref) {
        throw new NotFoundError("No manga found for title: " + ctx.manga.title);
    }

    const mangaUrl = mangaHref.startsWith('http') ? mangaHref : `${baseUrl}${mangaHref}`;
    const mangaHtml = await ctx.proxiedFetcher(mangaUrl);

    const $ = cheerio.load(mangaHtml);

    const chapters: Chapter[] = [];

    $('tr:has(a[href*="/chapter-"])').each((i, row) => {
        const anchor = $(row).find('a[href*="/chapter-"]');
        const href = anchor.attr('href')?.trim();
        const title = anchor.text().trim();

        if (!href || !title) return;

        let chapterNumber: string | undefined;
        const match = title.match(/Chapter\s+(\d+(\.\d+)?)/i);
        if (match) {
            chapterNumber = match[1];
        }

        chapters.push({
            id: String(i),
            sourceId: 'zinmangax',
            chapterNumber: chapterNumber ?? String(i),
            title: title,
            url: href.startsWith('http') ? href : `${baseUrl}${href}`,
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const html = await ctx.proxiedFetcher(ctx.chapter.url);

    const $ = cheerio.load(html);
    const pages: Page[] = [];

    $('img[src^="/api/cdn-image"]').each((i, el) => {
        const rawSrc = $(el).attr('src');
        if (!rawSrc) return;

        const fullUrl = rawSrc.startsWith('http') ? rawSrc : `${baseUrl}${rawSrc}`;

        pages.push({
            id: i,
            url: fullUrl,
        });
    });

    return pages;
}

export const zinmangaxScraper: Source = {
    id: 'zinmangax',
    name: 'ZinMangaX',
    url: baseUrl,
    rank: 15,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};
