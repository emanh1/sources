import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://readmanga.cc";

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const url = `${baseUrl}/browse`;
    const response = await ctx.proxiedFetcher(url, {
        query: {
            title: ctx.titleInput
        }
    })
    const $ = cheerio.load(response);
    const mangas: Manga[] = [];

    $('div.max-w.block').each((_, el) => {
        const $el = $(el);

        const linkEl = $el.find('a[href*="/manga/"]').first();
        const url = linkEl.attr('href');
        if (!url) return;
        const title = linkEl.attr('title') || linkEl.find('h2').text().trim();

        const coverUrl = $el.find('img').attr('src') ?? undefined;

        const altTitlesText = $el.find('div.line-clamp-2').text().trim();
        const altTitles =
            altTitlesText.length > 0
                ? altTitlesText.split(';').map((t) => t.trim()).filter(Boolean)
                : undefined;

        const tags: string[] = [];
        $el.find('a[href*="/browse/genre/"]').each((_, tagEl) => {
            const tag = $(tagEl).text().trim();
            if (tag) tags.push(tag);
        });

        const authorText = $el.find('p:contains("Author:")').text();
        const authorMatch = authorText.match(/Author:\s*(.+)/);
        const author = authorMatch ? [authorMatch[1].trim()] : undefined;

        const statusText = $el.find('p:contains("Status:")').text();
        let status: Manga['status'] = undefined;
        if (statusText.toLowerCase().includes('ongoing')) status = 'ongoing';
        else if (statusText.toLowerCase().includes('completed')) status = 'completed';
        else if (statusText.toLowerCase().includes('hiatus')) status = 'hiatus';
        else if (statusText.toLowerCase().includes('cancelled')) status = 'cancelled';

        const description = linkEl.find('p.line-clamp-5').text().trim() || undefined;

        mangas.push({
            sourceId: 'readmanga',
            title,
            altTitles: altTitles
                ? altTitles.map((t, i) => ({ [i.toString()]: t }))
                : undefined,
            description,
            coverUrl,
            author,
            status,
            tags: tags.length > 0 ? tags : undefined,
            url,
        });
    });
    return mangas
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(response);

    const chapters = getChapters($);
    return chapters;
}

function getChapters($: cheerio.CheerioAPI): Chapter[] {
    const chapters: Chapter[] = [];

    $('a[data-chapter]').each((_, el) => {
        const $el = $(el);
        const url = $el.attr('href') || '';
        const titleText = $el.find('h5').text().trim();
        const date = $el.find('p').text().trim();

        const match = titleText.match(/chapter\s*(\d+(\.\d+)?)/i);
        const chapterNumber = match ? match[1] : undefined;

        const parts = url.split('/').filter(Boolean);
        const chapterIdStr = parts[parts.length - 1];
        const chapterId = chapterIdStr.replace(/[^\d]/g, '');

        if (!url || chapterNumber === undefined) return;

        chapters.push({
            id: chapterId,
            sourceId: 'readmanga',
            chapterNumber,
            url,
            date,
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);
    console.log(response);
    const pages: Page[] = [];

    $('div.flex img').each((index, img) => {
        const $img = $(img);
        const src = $img.attr('src')?.trim();
        if (!src) return;

        pages.push({
            id: index,
            url: src,
        });
    });

    return pages;
}


export const readmangaScraper: Source = {
    id: 'readmanga',
    name: 'ReadManga',
    url: baseUrl,
    rank: 5,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};
