import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://www.readmangaseries.com";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}/manga/${toKebabCase(ctx.manga.title)}`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);

    const chapters: Chapter[] = [];

    $('#chapterlist li').each((_, el) => {
        const anchor = $(el).find('a');
        const href = anchor.attr('href')?.trim();
        const title = anchor.find('.chapternum').text().trim();
        const date = anchor.find('.chapterdate').text().trim();

        if (!href || !title) return;

        const match = title.match(/Chapter\s*(\d+(?:\.\d+)?)/i);
        const chapterNumber = match ? parseFloat(match[1]) : undefined;

        if (chapterNumber === undefined) return;

        chapters.push({
            id: chapterNumber,
            chapterNumber,
            date,
            url: href.startsWith('http') ? href : `${baseUrl}${href}`,
            sourceId: 'readmangaseries'
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

    $('#readerarea img.ts-main-image').each((i, img) => {
        const src = $(img).attr('src')?.trim();
        console.log(i);
        console.log(src);
        if (!src) return;

        pages.push({
            id: i,
            url: src,
            chapter: ctx.chapter
        });
    });

    return pages;
}

export const readMangaSeriesScraper: Source = {
    id: 'readmangaseries',
    name: 'Manga Series',
    url: baseUrl,
    rank: 11,
    flags: [flags.CORS_ALLOWED, flags.DYNAMIC_RENDER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};
