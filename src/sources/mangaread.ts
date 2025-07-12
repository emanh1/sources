import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://www.mangaread.org/";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}manga/${toKebabCase(ctx.manga.title)}/`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);

    const chapters = getChapters($);
    return chapters;
}

function getChapters($: cheerio.CheerioAPI): Chapter[] {
    // Select all chapter <li> items in the chapter list
    const chapterItems = $('li.wp-manga-chapter').toArray();

    return chapterItems.map((li) => {
        const $li = $(li);
        const $a = $li.find('a');
        const url = $a.attr('href') || '';

        // Chapter title e.g. "Chapter 81"
        const titleText = $a.text().trim();

        // Extract chapter number from titleText
        const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? parseFloat(match[1]) : undefined;

        // Get release date text
        const date = $li.find('.chapter-release-date i').text().trim();

        if (!url || chapterNumber === undefined) return null;

        // Extract chapter id from URL (last segment)
        const parts = url.split('/').filter(Boolean);
        const chapterIdStr = parts[parts.length - 1]; 
        const chapterId = parseInt(chapterIdStr.replace(/[^\d]/g, ''), 10);

        return {
            id: chapterId,
            chapterNumber,
            date,
            url,
            sourceId: 'mangaread'
        } satisfies Chapter;
    }).filter(Boolean) as Chapter[];
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('img.wp-manga-chapter-img').each((_, img) => {
        const $img = $(img);
        const src = $img.attr('src')?.trim() || '';
        if (!src) return;

        // Extract page number from id, fallback to index if missing
        const id = $img.attr('id') || '';
        const match = id.match(/image-(\d+)/);
        const pageNumber = match ? parseInt(match[1], 10) : pages.length;

        pages.push({
            id: pageNumber,
            url: src,
            chapter: ctx.chapter
        });
    });

    // Sort pages by id ascending to ensure correct order
    pages.sort((a, b) => a.id - b.id);

    return pages;
}
export const mangaReadScraper: Source = {
    id: 'mangaread',
    name: 'MangaRead',
    url: baseUrl,
    rank: 1,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};
