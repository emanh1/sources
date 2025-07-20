import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://mangack.com";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}/manga/${toKebabCase(ctx.manga.title)}`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);

    const chapters = $('ul.chapterslist li').toArray().map((li) => {
        const $li = $(li);
        const $a = $li.find('a.title');
        const url = $a.attr('href')?.trim();
        const titleText = $a.text().trim();

        const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? parseFloat(match[1]) : undefined;

        const date = $li.find('span.entry-date').text().trim();

        if (!url || chapterNumber === undefined) return null;

        const parts = url.split('/').filter(Boolean);
        const chapterIdStr = parts[parts.length - 1];
        const chapterId = parseInt(chapterIdStr.replace(/[^\d]/g, ''), 10);

        return {
            chapterId,
            chapterNumber,
            date,
            url,
            sourceId: 'mangack'
        } satisfies Chapter;
    }).filter(Boolean) as Chapter[];

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('div.entry-content img.aligncenter').each((index, img) => {
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

export const mangackScraper: Source = {
    id: 'mangack',
    name: 'Mangack',
    url: baseUrl,
    rank: 8,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};

