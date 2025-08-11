import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://novamanga.com";

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const response = await ctx.proxiedFetcher(`${baseUrl}/search`, {
        query: {
            search: ctx.titleInput
        },
        method: "POST"
    })
    const $ = cheerio.load(response);
    const mangas: Manga[] = [];
    $('a[href^="/series/"]').each((_, el) => {
        const $el = $(el);
        const url = $el.attr('href');
        if (!url) return;

        const title = $el.find('p.text-lg.font-semibold').text().trim();

        const coverUrl = $el.find('img').attr('src') ?? undefined;

        mangas.push({
            sourceId: 'novamanga',
            title,
            url: `${baseUrl}${url}`,
            coverUrl,
        });
    });

    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
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
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};