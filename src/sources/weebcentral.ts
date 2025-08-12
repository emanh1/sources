import type { ChapterContext, MangaContext, SearchContext } from "@/utils/context";
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from "./base";
import { flags } from "@/entrypoint/targets";
import type { Chapter, Manga, Page } from "@/utils/types";
import * as cheerio from 'cheerio';

const baseUrl = 'https://weebcentral.com'

function parseMangas(html: string): Manga[] {
    const $ = cheerio.load(html);
    const mangas: Manga[] = [];

    $('article.bg-base-300').each((_, el) => {
        const root = $(el);

        const fullUrl = root.find('section:first-child a').attr('href');
        if (!fullUrl) return;
        const parts = fullUrl.split('/');
        parts.pop();
        const url = parts.join('/');

        const idMatch = url.match(/series\/([^/]+)/);
        const id = idMatch ? idMatch[1] : undefined;

        const title = root
            .find('section:nth-child(2) span.tooltip a.line-clamp-1')
            .text()
            .trim();

        const yearText = root.find('section:nth-child(2) div:contains("Year:") span').text().trim();
        const year = yearText ? Number(yearText) : null;

        const statusText = root.find('section:nth-child(2) div:contains("Status:") span').text().trim().toLowerCase();
        let status: Manga['status'] | undefined;
        if (['completed', 'ongoing', 'hiatus', 'cancelled'].includes(statusText)) {
            status = statusText as Manga['status'];
        }

        const authors: string[] = [];
        root.find('section:nth-child(2) div:contains("Author(s):") a').each((_, a) => {
            const authorName = $(a).text().trim();
            if (authorName) authors.push(authorName);
        });

        const tags: string[] = [];
        root.find('section:nth-child(2) div:contains("Tag(s):") span').each((_, span) => {
            const tag = $(span).text().trim().replace(/,$/, '');
            if (tag) tags.push(tag);
        });

        const coverUrl = root.find('section:first-child a article picture img').attr('src');

        mangas.push({
            id,
            sourceId: 'weebcentral',
            title,
            url,
            year,
            status,
            author: authors.length ? authors : undefined,
            tags: tags.length ? tags : undefined,
            coverUrl,
        });
    });

    return mangas;
}

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const response = await ctx.proxiedFetcher(baseUrl + '/search/data', {
        query: {
            author: '',
            text: ctx.titleInput,
            sort: 'Best Match',
            order: 'Descending',
            official: 'Any',
            anime: 'Any',
            adult: 'Any',
            display_mode: 'Full Display',
        }
    })
    return parseMangas(response);
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url + '/full-chapter-list');
    const $ = cheerio.load(response);
    const chapters: Chapter[] = [];

    $('div.flex.items-center').each((_, el) => {
        const anchor = $(el).find('a.hover\\:bg-base-300');
        if (!anchor.length) return;

        const url = anchor.attr('href') || '';
        // Extract id from url last segment
        const id = url.split('/').filter(Boolean).pop() || '';

        // Extract title text like "Chapter 142"
        const titleText = anchor.find('span').filter((_, s) => {
            const text = $(s).text();
            return /^Chapter\s+\d+/i.test(text.trim());
        }).first().text().trim();

        // Extract chapterNumber from title, e.g. "142" from "Chapter 142"
        const chapterNumberMatch = titleText.match(/Chapter\s+(\d+)/i);
        const chapterNumber = chapterNumberMatch ? chapterNumberMatch[1] : null;

        // Extract datetime from <time> tag inside anchor
        const date = anchor.find('time').attr('datetime') || undefined;

        chapters.push({
            id,
            sourceId: 'weebcentral',
            url,
            // title: titleText || null,
            chapterNumber,
            date,
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const pages: Page[] = [];
    const response = await ctx.proxiedFetcher(ctx.chapter.url + '/images', {
        query: {
            is_prev: 'false',
            current_page: "1",
            reading_style: 'long_strip'
        }
    });
    const $ = cheerio.load(response);
    $('section.flex-1 img').each((i, el) => {
        const url = $(el).attr('src') || '';
        if (!url) return;
        pages.push({ id: i, url });
    });
    return pages
}

export const weebCentralScraper: Source = {
    id: 'weebcentral',
    name: 'WeebCentral',
    url: baseUrl,
    rank: 22,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};