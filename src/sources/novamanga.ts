import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://novamanga.com";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}/series/${toKebabCase(ctx.manga.title)}`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);

    const chapters = $('a.recentCardItem').toArray().map((a) => {
        const $a = $(a);
        const url = $a.attr('href')?.trim();
        if (!url) return null;

        const chapterText = $a.find('p.text-sm.font-medium').text().trim();
        const dateText = $a.find('p.text-xs.font-medium').text().trim();

        const match = chapterText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? match[1] : undefined;

        if (chapterNumber === undefined) return null;

        const fullUrl = url.startsWith('http') ? url : baseUrl + url;

        return {
            id: chapterNumber,
            sourceId: 'novamanga',
            chapterNumber,
            url: fullUrl,
            date: dateText
        } satisfies Chapter;
    }).filter(Boolean) as Chapter[];

    return chapters;
}


async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    // Select images with id like img_0, img_1 etc.
    $('img[id^="img_"]').each((index, img) => {
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

export const novaMangaScraper: Source = {
    id: 'novamanga',
    name: 'Nova Manga',
    url: baseUrl,
    rank: 10,
    flags: [flags.CORS_ALLOWED, flags.NEEDS_REFERER_HEADER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};