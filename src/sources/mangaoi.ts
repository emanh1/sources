import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { NotFoundError } from '@/utils/errors';

const baseUrl = 'https://mangaoi.net';

function parseManga(html: string, url: string): Manga {
    const $ = cheerio.load(html);

    const title = $('header.ep-cover_ch .main-head h1').text().trim();

    const altTitlesText = $('header.ep-cover_ch .manga-info .item-head:contains("Alternative:")')
        .next('.item-content').text().trim();
    const altTitlesArr: { [key: string]: string }[] | undefined = altTitlesText
        ? altTitlesText.split(' / ').map((title, i) => {
            return { [i.toString()]: title.trim() };
        })
        : undefined;

    let coverUrl = $('header.ep-cover_ch .comic-cover').css('background-image') || undefined;
    if (coverUrl !== undefined) coverUrl = coverUrl.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');

    if (!coverUrl) {
        coverUrl = $('header.ep-cover_ch .novel-cover img.image-novel').attr('src') || undefined;
    }

    const tags: string[] = [];
    $('header.ep-cover_ch .manga-info .item-head:contains("Genre")')
        .siblings('.item-content')
        .find('a.tag_btn')
        .each((_, el) => {
            tags.push($(el).text().trim());
        });

    const statusText = $('header.ep-cover_ch .manga-info .item-head:contains("Status")')
        .next('.item-name').text().trim().toLowerCase();

    let status: Manga['status'] = undefined;
    if (statusText.includes('ongoing')) status = 'ongoing';
    else if (statusText.includes('completed')) status = 'completed';
    else if (statusText.includes('hiatus')) status = 'hiatus';
    else if (statusText.includes('cancelled')) status = 'cancelled';

    return {
        sourceId: 'mangaoi',
        title,
        altTitles: altTitlesArr,
        coverUrl,
        status,
        tags,
        url,
    };
}

// search api blocked :( or proxy is not working properly
async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const mangas: Manga[] = [];
    // const searchUrl = `${baseUrl}/search/html/1`;
    // const body = new URLSearchParams();
    // body.append('keyword', ctx.titleInput);

    // const searchHtml = await ctx.proxiedFetcher(searchUrl, {
    //     body: body.toString(),  // serialize as string
    //     headers: {
    //         "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    //     },
    //     method: "POST",
    // });

    // const $ = cheerio.load(searchHtml);

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
    //         sourceId: 'mangaoi',
    //         title,
    //         coverUrl,
    //         url,
    //     });
    // });
    const mangaUrl = `${baseUrl}/read-manga/${ctx.titleInput
        .toLowerCase()
        .normalize("NFKD") // normalize accented characters
        .replace(/[’']/g, '') // remove apostrophes (both straight and curly)
        .replace(/[^a-z0-9]+/g, '-') // replace other non-alphanumerics with hyphen
        .replace(/^-+|-+$/g, '') // trim hyphens
        }`;
    const $ = cheerio.load(await ctx.proxiedFetcher(mangaUrl));
    if ($('body').text().includes('404') || $('body').text().toLowerCase().includes('not found')) {
        throw new NotFoundError(`[MangaOi] ${ctx.titleInput} not found`);
    }
    mangas.push(parseManga($.html(), mangaUrl))
    return mangas;
}


async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const mangaHtml = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(mangaHtml);

    const chapters: Chapter[] = [];

    $('#chapter-list li a').each((i, el) => {
        const href = $(el).attr('href')?.trim();
        const title = $(el).find('strong').text().trim();

        if (!href || !title) return;

        let chapterNumber: string | undefined;
        const match = title.match(/Chapter\s+(\d+(\.\d+)?)/i);
        if (match) {
            chapterNumber = match[1];
        }

        chapters.push({
            id: chapterNumber ?? 'l' + String(i),
            sourceId: 'mangaoi',
            title: title,
            chapterNumber: chapterNumber ?? String(i),
            url: href.startsWith('http') ? href : `${baseUrl}${href} `,
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
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};
