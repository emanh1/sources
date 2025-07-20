import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://readmanga.cc/";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}manga/${toKebabCase(ctx.manga.title)}/`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);

    const chapters = getChapters($);
    return chapters;
}

function getChapters($: cheerio.CheerioAPI): Chapter[] {
    const chapters: Chapter[] = [];

    $('a[data-chapter]').each((_, el) => {
        const $el = $(el);
        const url = $el.attr('href') || '';
        const titleText = $el.find('h5').text().trim();
        const date = $el.find('p').text().trim();

        const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? parseFloat(match[1]) : undefined;

        const parts = url.split('/').filter(Boolean);
        const chapterIdStr = parts[parts.length - 1];
        const chapterId = parseInt(chapterIdStr.replace(/[^\d]/g, ''), 10);

        if (!url || chapterNumber === undefined || isNaN(chapterId)) return;

        chapters.push({
            chapterId,
            chapterNumber,
            date,
            url,
            sourceId: 'readmanga'
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('div.flex img').each((index, img) => {
        const $img = $(img);
        const src = $img.attr('src')?.trim();
        if (!src) return;

        pages.push({
            id: index,
            url: src,
            chapter: ctx.chapter
        });
    });

    return pages;
}


export const readmangaScraper: Source = {
    id: 'readmanga',
    name: 'ReadManga',
    url: baseUrl,
    rank: 5,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};
