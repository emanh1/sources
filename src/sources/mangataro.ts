import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://mangataro.net";

function sanitizeTitleForSlug(title: string): string {
    const cleaned = title
        .replace(/['’]/g, '') // remove apostrophes
        .replace(/[^\w\s-]/g, '') // remove non-word characters except hyphens/spaces
        .replace(/\s+/g, ' ') // normalize whitespace
        .trim();

    return toKebabCase(cleaned);
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}/manga/${sanitizeTitleForSlug(ctx.manga.title)}`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);

    const chapters = $('div.chapter-list a').toArray().map((a) => {
        const $a = $(a);
        const url = $a.attr('href')?.trim();
        const titleText = $a.attr('title')?.trim() ?? '';

        const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? match[1] : undefined;

        const dateText = $a.find('div.flex.items-center span').first().text().trim();

        if (!url || chapterNumber === undefined) return null;

        const parts = url.split('/').filter(Boolean);
        const chapterIdStr = parts[parts.length - 1];
        const chapterId = chapterIdStr.replace(/[^\d]/g, '');

        return {
            id: chapterId,
            sourceId: 'mangataro',
            chapterNumber,
            url,
            date: dateText,
        } satisfies Chapter;
    }).filter(Boolean) as Chapter[];

    return chapters;
}


async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('div.comic-image-container img').each((index, img) => {
        const $img = $(img);
        const src = $img.attr('data-src')?.trim() || $img.attr('src')?.trim();
        if (!src) return;

        pages.push({
            id: index,
            url: src,
        });
    });

    return pages;
}


export const mangaTaroScraper: Source = {
    id: 'mangataro',
    name: 'MangaTARO',
    url: baseUrl,
    rank: 9,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};

