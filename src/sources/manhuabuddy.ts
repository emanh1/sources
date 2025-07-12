import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://manhuabuddy.com"

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}/manhwa/${toKebabCase(ctx.manga.title)}/`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);

    const chapters = getChapters($);
    return chapters;
}

function getChapters($: cheerio.CheerioAPI): Chapter[] {
    // Select all chapter <li> items in the chapter list
    const chapterItems = $('li.citem').toArray();

    return chapterItems.map((li) => {
        const $li = $(li);
        const $a = $li.find('a');
        const url = $a.attr('href') || '';
        const titleText = $a.text().trim();

        // Extract chapter number from title
        const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? parseFloat(match[1]) : undefined;

        // Get release date from <span class="time">
        const date = $li.find('.time').text().trim();

        if (!url || chapterNumber === undefined) return null;

        const parts = url.split('/').filter(Boolean);
        const chapterIdStr = parts[parts.length - 1].replace(/[^\d]/g, '');
        const chapterId = parseInt(chapterIdStr, 10);
        return {
            id: chapterId,
            chapterNumber,
            date,
            url: baseUrl + "/" + url,
            sourceId: 'manhuabuddy'
        } satisfies Chapter;
    }).filter(Boolean) as Chapter[];
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('.item-photo img').each((idx, img) => {
        const $img = $(img);
        const src = $img.attr('src')?.trim() || '';
        if (!src) return;
        pages.push({
            id: idx + 1,
            url: src,
            chapter: ctx.chapter
        });
    });
    return pages;
}

export const manhuaBuddyScraper: Source = {
    id: 'manhuabuddy',
    name: 'ManhuaBuddy',
    url: baseUrl,
    rank: 3,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};
