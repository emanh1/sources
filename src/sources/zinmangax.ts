import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = 'https://zinmangax.com';

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const searchUrl = `${baseUrl}/search`;
    const searchHtml = await ctx.proxiedFetcher(searchUrl, {
        query: {
            q: ctx.titleInput
        }
    })
    const $ = cheerio.load(searchHtml);
    const mangas: Manga[] = [];
    $('.grid > .group').each((_, el) => {
        const el$ = $(el);

        const titleAnchor = el$.find('a[title][href]').first();
        const title = titleAnchor.attr('title')?.trim() || '';
        const url = titleAnchor.attr('href') || '';

        // Cover image URL
        const coverImg = el$.find('img').first();
        const coverUrl = coverImg.attr('src') || '';

        mangas.push({
            sourceId: 'zinmangax', // replace with your source id string
            title,
            url: baseUrl + url,
            coverUrl,
        });
    });
    return mangas
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const mangaHtml = await ctx.proxiedFetcher(ctx.manga.url);

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
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};
