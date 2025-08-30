import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://mangataro.org";

export type RawMangaResponseItem = {
    id: string;
    title: string;
    slug: string;
    alt_titles: string[];
    authors: string[];
    permalink: string;
    thumbnail: string;
    description: string;
    type: string; // e.g. "Manga", "Manhwa", etc.
    status: string; // e.g. "Ongoing", "Completed"
};

export type RawMangaResponse = RawMangaResponseItem[];

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const url = `${baseUrl}/wp-json/manga/v1/search`;
    const response = await ctx.proxiedFetcher(url, {
        query: {
            query: ctx.titleInput
        },
        method: "POST"
    })
    const data: RawMangaResponse = response;

    const mangas: Manga[] = data.map((item) => ({
        id: item.id,
        sourceId: 'mangataro',
        title: item.title,
        altTitles: item.alt_titles.map((title) => ({ title })),
        description: item.description,
        coverUrl: item.thumbnail,
        author: item.authors,
        status:
            item.status.toLowerCase() === 'completed'
                ? 'completed'
                : item.status.toLowerCase() === 'ongoing'
                    ? 'ongoing'
                    : 'hiatus',
        url: item.permalink,
    }));

    return mangas
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
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
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};

