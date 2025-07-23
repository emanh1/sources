import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = 'https://mangaoi.net';

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const mangaUrl = `${baseUrl}/read-manga/${ctx.manga.title
        .toLowerCase()
        .normalize("NFKD") // normalize accented characters
        .replace(/[’']/g, '') // remove apostrophes (both straight and curly)
        .replace(/[^a-z0-9]+/g, '-') // replace other non-alphanumerics with hyphen
        .replace(/^-+|-+$/g, '') // trim hyphens
        } `;
    const mangaHtml = await ctx.proxiedFetcher(mangaUrl);
    const $ = cheerio.load(mangaHtml);

    const chapters: Chapter[] = [];

    $('#chapter-list li a').each((i, el) => {
        const href = $(el).attr('href')?.trim();
        const title = $(el).find('strong').text().trim();

        if (!href || !title) return;

        let chapterNumber: number | undefined;
        const match = title.match(/Chapter\s+(\d+(\.\d+)?)/i);
        if (match) {
            chapterNumber = parseFloat(match[1]);
        }

        chapters.push({
            chapterId: i,
            chapterNumber: chapterNumber ?? i,
            chapterTitle: title,
            url: href.startsWith('http') ? href : `${baseUrl}${href} `,
            sourceId: 'mangaoi'
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('.item-chapter img').each((i, img) => {
        const src = $(img).attr('src')?.trim();
        if (!src || !src.startsWith('http')) return;

        pages.push({
            id: i,
            url: src,
            chapter: ctx.chapter
        });
    });

    return pages;
}

export const mangaoiScraper: Source = {
    id: 'mangaoi',
    name: 'MangaOi',
    url: baseUrl,
    rank: 14,
    flags: [flags.CORS_ALLOWED],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};
