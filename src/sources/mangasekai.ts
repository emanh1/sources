import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://mangasekai.co";

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const mangas: Manga[] = [];
    const response = await ctx.proxiedFetcher(`${baseUrl}/search/`, {
        query: {
            searchTerm: encodeURIComponent(ctx.titleInput).replace(/%20/g, '+')
        },
        method: "POST"
    })
    const $ = cheerio.load(response);
    $('.manga-display').each((_, el) => {
        const container = $(el);
        const linkEl = container.find('.manga-container > a');
        const url = linkEl.attr('href');
        const title = container.find('.manga-name').text().trim();
        const img = container.find('img').attr('src');

        if (url && title) {
            mangas.push({
                title,
                url: baseUrl + url,
                coverUrl: img,
                sourceId: 'mangasekai'
            });
        }
    });
    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const mangaHtml = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(mangaHtml);

    const chapters: Chapter[] = [];

    $('div.chapter-list a').each((i, el) => {
        const href = $(el).attr('href')?.trim();
        const title = $(el).find('h3.chapeter-info').text().trim();
        const date = $(el).find('p.chapter-time').text().trim();

        if (!href || !title) return;

        let chapterNumber: string | undefined = undefined;
        const match = title.match(/(\d+\.\d+|\d+)/);
        if (match) {
            chapterNumber = match[1];
        }

        chapters.push({
            id: String(i),
            sourceId: 'mangasekai',
            title: title,
            chapterNumber: chapterNumber ?? String(i),
            url: href.startsWith('http') ? href : `${baseUrl}/manga/${href}`,
            date: date,
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const html = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(html);

    const pages: Page[] = [];

    $('div.image-container img').each((i, img) => {
        const src = $(img).attr('src')?.trim();
        if (src?.startsWith("http")) {
            pages.push({
                id: i,
                url: src,
            });
        }
    });

    return pages;
}

export const mangasekaiScraper: Source = {
    id: 'mangasekai',
    name: 'MangaSekai',
    url: baseUrl,
    rank: 12,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};

