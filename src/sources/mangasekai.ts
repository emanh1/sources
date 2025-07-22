import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { NotFoundError } from '@/utils/errors';

const baseUrl = "https://mangasekai.co";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const searchUrl = `${baseUrl}/search/${encodeURIComponent(ctx.manga.title)}`;
    const searchHtml = await ctx.proxiedFetcher(searchUrl);
    const $search = cheerio.load(searchHtml);

    const firstResult = $search('div.manga-container a').first();
    const mangaHref = firstResult.attr('href');
    if (!mangaHref) throw new NotFoundError("No manga found for title: " + ctx.manga.title);

    const mangaUrl = mangaHref.startsWith('http') ? mangaHref : `${baseUrl}${mangaHref}`;
    const mangaHtml = await ctx.proxiedFetcher(mangaUrl);
    const $ = cheerio.load(mangaHtml);

    const chapters: Chapter[] = [];

    $('div.chapter-list a').each((i, el) => {
        const href = $(el).attr('href')?.trim();
        const title = $(el).find('h3.chapeter-info').text().trim();
        const date = $(el).find('p.chapter-time').text().trim();

        if (!href || !title) return;

        let chapterNumber: number | undefined = undefined;
        const match = title.match(/(\d+\.\d+|\d+)/);
        if (match) {
            chapterNumber = parseFloat(match[1]);
        }

        chapters.push({
            chapterId: i,
            chapterNumber: chapterNumber ?? i,
            chapterTitle: title,
            url: href.startsWith('http') ? href : `${baseUrl}/manga/${href}`,
            date: date,
            sourceId: 'mangasekai'
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const html = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(html);

    const pages: Page[] = [];

    $('div.image-container img').each((i, img) => {
        const src = $(img).attr('src')?.trim();
        if (src?.startsWith("http")) {
            pages.push({
                id: i,
                url: src,
                chapter: ctx.chapter
            });
        }
    });

    return pages;
}

export const mangasekaiScraper: Source = {
    id: 'mangasekai',
    name: 'MangaSekai',
    url: baseUrl,
    rank: 12,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};

