import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://manhuabuddy.com"


//literally the same as mangaoi
async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const mangas: Manga[] = [];
    const searchUrl = `${baseUrl}/search/`;
    const searchHtml = await ctx.proxiedFetcher(searchUrl, {
        query: {
            s: ctx.titleInput
        }
    });

    const $ = cheerio.load(searchHtml);

    // $('ul li a.item').each((_, el) => {
    //     const element = $(el);

    //     let relativeUrl = element.attr('href') ?? '';
    //     const url = relativeUrl.startsWith('http')
    //         ? relativeUrl
    //         : baseUrl.replace(/\/$/, '') + relativeUrl;

    //     const img = element.find('img');
    //     const coverUrl = img.attr('src') ?? '';

    //     const title = img.attr('alt')?.trim() || element.contents().first().text().trim();

    //     mangas.push({
    //         sourceId: 'manhuabuddy',
    //         title,
    //         coverUrl,
    //         url,
    //     });
    // });
    $('.list_wrap ul > li').each((_, el) => {
        const root = $(el);
        const linkEl = root.find('div.visual a').first();
        const url = linkEl.attr('href');
        if (!url) return;
        const realUrl = url.replace('read-hentai', 'manhwa')
        const title = linkEl.find('img').attr('alt')?.trim() || linkEl.text().trim();

        const coverUrl = linkEl.find('img').attr('src') || undefined;

        mangas.push({
            sourceId: 'manhuabuddy',
            title,
            url: realUrl,
            coverUrl,
        });
    });


    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(response);

    const chapters = getChapters($);
    return chapters;
}

function getChapters($: cheerio.CheerioAPI): Chapter[] {
    const chapterItems = $('li.citem').toArray();

    return chapterItems.map((li) => {
        const $li = $(li);
        const $a = $li.find('a');
        const url = $a.attr('href') || '';
        const titleText = $a.text().trim();

        const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? match[1] : undefined;

        const date = $li.find('.time').text().trim();

        if (!url || chapterNumber === undefined) return null;

        const parts = url.split('/').filter(Boolean);
        const chapterIdStr = parts[parts.length - 1].replace(/[^\d]/g, '');
        const chapterId = chapterIdStr;
        return {
            id: chapterId,
            sourceId: 'manhuabuddy',
            chapterNumber,
            url: baseUrl + "/" + url,
            date
        } satisfies Chapter;
    }).filter(Boolean) as Chapter[];
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);

    const pages: Page[] = [];

    $('.item-photo img').each((idx, img) => {
        const $img = $(img);
        const src = $img.attr('src')?.trim() || '';
        if (!src) return;
        pages.push({
            id: idx + 1,
            url: src,
        });
    });
    return pages;
}

export const manhuaBuddyScraper: Source = {
    id: 'manhuabuddy',
    name: 'ManhuaBuddy',
    url: baseUrl,
    rank: 3,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};
