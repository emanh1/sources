import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://mangapark.net";
    // mirrors:
    // https://mangapark.com
    // https://mangapark.net
    // https://mangapark.org
    // https://mangapark.me
    // https://mangapark.io
    // https://mangapark.to
    // https://comicpark.org
    // https://comicpark.to
    // https://readpark.org
    // https://readpark.net
    // https://parkmanga.com
    // https://parkmanga.net
    // https://parkmanga.org
    // https://mpark.to
async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const searchUrl = `${baseUrl}/search?word=${encodeURIComponent(ctx.manga.title)}`;
    const searchHtml = await ctx.proxiedFetcher(searchUrl, {
        headers: {
            'x-use-browser': 'true'
        }
    });
    const $search = cheerio.load(searchHtml);

    const firstResult = $search('a.link-hover.link-pri').first();
    const mangaHref = firstResult.attr('href');

    if (!mangaHref) throw new Error("No manga found for title: " + ctx.manga.title);

    const mangaUrl = mangaHref.startsWith('http') ? mangaHref : `${baseUrl}${mangaHref}`;
    const mangaHtml = await ctx.proxiedFetcher(mangaUrl);
    const $ = cheerio.load(mangaHtml);

    const chapters: Chapter[] = [];

    // naming/numbering is too inconsistent on the site, just have to live with it
    $('a.link-hover.link-primary').each((i, el) => {
        const href = $(el).attr('href')?.trim();
        const title = $(el).text().trim();

        if (!href || !title) return;

        const normalized = title.replace(/\s+/g, ' ').trim();

        let chapterNumber: number | undefined = undefined;

        const patterns = [
            /Chapter\s+(\d+\.\d+|\d+-\d+|\d+)/i,
            /Ch\.(\d+\.\d+|\d+-\d+|\d+)/i,
            /Punch\s+(\d+\.\d+|\d+-\d+|\d+)/i,
            /Vol\.\d+\s+Ch\.(\d+\.\d+|\d+-\d+|\d+)/i,
            /Volume\s+\d+\s+Chapter\s+(\d+\.\d+|\d+-\d+|\d+)/i,
            /Ch(?:apter)?\s*(\d+\.\d+|\d+-\d+|\d+)/i,
            /Ch\.(\d+)/i,
            /(\d+\.\d+|\d+)/
        ];

        for (const pattern of patterns) {
            const match = normalized.match(pattern);
            if (match) {
                const raw = match[1].replace('-', '.');
                const parsed = parseFloat(raw);
                if (!isNaN(parsed)) {
                    chapterNumber = parsed;
                    break;
                }
            }
        }

        chapters.push({
            id: i,
            chapterNumber: chapterNumber ?? i,
            chapterTitle: title,
            url: href.startsWith('http') ? href : `${baseUrl}${href}`,
            sourceId: 'mangapark'
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

    $('img.w-full.h-full').each((i, img) => {
        const src = $(img).attr('src')?.trim();
        if (!src) return;
        if (!src.startsWith("http")) return;
        pages.push({
            id: i,
            url: src,
            chapter: ctx.chapter
        });
    });

    return pages;
}
///SLOW!
export const mangaparkScraper: Source = {
    id: 'mangapark',
    name: 'MangaPark',
    url: baseUrl,
    rank: 13,
    flags: [flags.CORS_ALLOWED, flags.DYNAMIC_RENDER, flags.NEEDS_REFERER_HEADER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};

