import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://mangack.com";

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const response = await ctx.proxiedFetcher(baseUrl, {
        query: {
            s: encodeURIComponent(ctx.titleInput).replace(/%20/g, '+')
        }
    });
    const $ = cheerio.load(response);

    const mangas: SourceMangasOutput = [];

    for (const div of $('.Latest_chapter_update').toArray()) {
        const $div = $(div);

        const $a = $div.find('a').first();
        const url = $a.attr('href')?.trim();
        const title = $a.attr('title')?.trim() || $div.find('h4 a').text().trim();

        const id = url ? url.split('/').filter(Boolean).pop() : undefined;

        const img = $div.find('img').first();
        const image = img.attr('src')?.trim();

        if (!id || !title || !url) continue;

        mangas.push({
            id,
            title,
            url,
            coverUrl: image,
            sourceId: 'mangack',
        });
    }

    return mangas;
}


async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(response);

    const chapters = $('ul.chapterslist li').toArray().map((li) => {
        const $li = $(li);
        const $a = $li.find('a.title');
        const url = $a.attr('href')?.trim();
        const titleText = $a.text().trim();

        const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? match[1] : undefined;

        const date = $li.find('span.entry-date').text().trim();

        if (!url || chapterNumber === undefined) return null;

        const parts = url.split('/').filter(Boolean);
        const chapterIdStr = parts[parts.length - 1];
        const chapterId = chapterIdStr.replace(/[^\d]/g, '');

        return {
            id: chapterId,
            sourceId: 'mangack',
            chapterNumber,
            date,
            url,
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
            url: src
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
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};

