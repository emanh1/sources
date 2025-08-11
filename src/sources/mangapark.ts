import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
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

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const searchHtml = await ctx.proxiedFetcher(`${baseUrl}/search`, {
        query: {
            word: encodeURIComponent(ctx.titleInput)
        }
    });
    const $ = cheerio.load(searchHtml);

    const resultsContainer = $('div.grid.gap-5.grid-cols-1.border-t.border-t-base-200.pt-5');

    const mangaDivs = resultsContainer.find('div.flex.border-b.border-b-base-200.pb-5');

    const mangas = mangaDivs.map((_, div) => {
        const el = $(div);

        const relativeUrl = el.find('a').first().attr('href');
        if (!relativeUrl) return null;
        const url = new URL(relativeUrl, baseUrl).href;

        const title = el.find('h3 a').text().trim();

        const coverRelative = el.find('a img').first().attr('src');
        const coverUrl = coverRelative ? new URL(coverRelative, baseUrl).href : undefined;

        // const ratingText = el.find('span.text-yellow-500').first().text().trim();
        // const rating = ratingText ? parseFloat(ratingText) : undefined;

        // const author = el.find('div.text-xs.opacity-80.line-clamp-2').text().trim() || undefined;

        return {
            id: url,
            sourceId: 'mangapark',
            url,
            title,
            coverUrl,
            // author,
        };
    }).get().filter(Boolean); // Remove nulls

    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const mangaHtml = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(mangaHtml);

    const chapters: Chapter[] = [];

    // naming/numbering is too inconsistent on the site, just have to live with it
    $('a.link-hover.link-primary').each((i, el) => {
        const href = $(el).attr('href')?.trim();
        const title = $(el).text().trim();

        if (!href || !title) return;

        const normalized = title.replace(/\s+/g, ' ').trim();

        let chapterNumber: string | undefined = undefined;

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
                chapterNumber = raw;
                break;
            }
        }

        chapters.push({
            id: String(i),
            sourceId: 'mangapark',
            title,
            chapterNumber: chapterNumber ?? String(i),
            url: href.startsWith('http') ? href : `${baseUrl}${href}`,
        });
    });

    return chapters;
}


async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('img.w-full.h-full').each((i, img) => {
        const src = $(img).attr('src')?.trim();
        if (!src) return;
        if (!src.startsWith("http")) return;
        pages.push({
            id: i,
            url: src,
        });
    });

    return pages;
}

export const mangaparkScraper: Source = {
    id: 'mangapark',
    name: 'MangaPark',
    url: baseUrl,
    rank: 13,
    flags: [flags.CORS_ALLOWED, flags.DYNAMIC_RENDER, flags.NEEDS_REFERER_HEADER],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};