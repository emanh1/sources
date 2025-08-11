import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from '@/sources/base';
import { Element } from 'domhandler';
import { flags } from '@/entrypoint/targets';
import { chapterFun, extractDm5KeyFromPacked, extractVarFromScript } from '@/utils/chapterfunashx';

const baseUrl = "https://fanfox.net";

function parseMangas($: cheerio.CheerioAPI): Manga[] {
    const mangas: Manga[] = [];
    $('ul.manga-list-4-list > li').each((_, el) => {
        const $el = $(el);

        const $titleLink = $el.find('p.manga-list-4-item-title > a');
        const title = $titleLink.attr('title')?.trim() || '';
        const relativeUrl = $titleLink.attr('href') || '';
        const url = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;

        const coverUrl = $el.find('a > img.manga-list-4-cover').attr('src') || '';

        const authors: string[] = [];
        $el.find('p.manga-list-4-item-tip').each((_, tip) => {
            const text = $(tip).text().trim();
            if (text.startsWith('Author:')) {
                $(tip).find('a.blue').each((_, a) => {
                    const authorName = $(a).text().trim();
                    if (authorName) authors.push(authorName);
                });
            }
        });

        const statusText = $el.find('p.manga-list-4-show-tag-list-2 > a').text().toLowerCase();
        let status: Manga['status'] = undefined;
        if (statusText.includes('completed')) status = 'completed';
        else if (statusText.includes('ongoing')) status = 'ongoing';
        else if (statusText.includes('hiatus')) status = 'hiatus';
        else if (statusText.includes('cancelled')) status = 'cancelled';

        let description = '';
        const tipParagraphs = $el.find('p.manga-list-4-item-tip').toArray();
        for (let i = tipParagraphs.length - 1; i >= 0; i--) {
            const tipText = $(tipParagraphs[i]).text().trim();
            if (!tipText.startsWith('Author:') && !tipText.startsWith('Latest Chapter:')) {
                description = tipText;
                break;
            }
        }

        mangas.push({
            sourceId: 'fanfox',
            title,
            url,
            coverUrl,
            author: authors,
            artist: [],
            status,
            description,
        });
    });

    return mangas;
}

function parseChapters($: cheerio.CheerioAPI): Chapter[] {
    const container = $('#chapterlist');
    let links: Element[] = [];

    if (container.find('#list-2 ul.detail-main-list').length) {
        links = container.find('#list-2 ul.detail-main-list li a').toArray();
    } else if (container.find('#list-1 ul.detail-main-list').length) {
        links = container.find('#list-1 ul.detail-main-list li a').toArray();
    } else {
        links = container.find('.detail-main-list ul li a').toArray();
    }
    return links.flatMap((el) => {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href) return [];

        const title = $el.find('.title3').text().trim();
        const date = $el.find('.title2').text().trim();

        const match = title.match(/Ch\.(\d+(\.\d+)?)/i) || title.match(/c(\d+(\.\d+)?)/i);
        const number = match ? match[1] : undefined;
        if (number === undefined) return [];

        return [{
            id: number,
            sourceId: 'fanfox',
            title,
            chapterNumber: number,
            url: baseUrl + href,
            date,
        } satisfies Chapter];
    });
}

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const url = `${baseUrl}/search`;
    const response = await ctx.proxiedFetcher(url, {
        query: {
            title: encodeURIComponent(ctx.titleInput).replace(/%20/g, '+')
        }
    });
    const $ = cheerio.load(response);
    const mangas = parseMangas($);
    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(response);
    const chapters = parseChapters($);
    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);
    const scripts = $('script')
        .toArray()
        .filter(s => !$(s).attr('src'))
        .map(s => $(s).html() || '');

    const chapterid = extractVarFromScript(scripts[1], 'chapterid');
    const totalPages = extractVarFromScript(scripts[1], 'imagecount');
    const dm5_key = extractDm5KeyFromPacked(scripts[3]);

    if (!chapterid || !dm5_key || !totalPages) {
        throw new Error('[Fanfox] Missing required variables');
    }
    const fetchChapterImages = chapterFun(ctx, chapterid, totalPages, dm5_key);
    const uniqueUrls = await fetchChapterImages();

    return uniqueUrls.map((url, idx) => {
        const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https:${url}`;

        return {
            id: idx,
            url: normalizedUrl,
        };
    }) as Page[];

}

export const fanFoxScraper: Source = {
    id: 'fanfox',
    name: 'FanFox (MangaFox)',
    url: baseUrl,
    rank: 16,
    flags: [flags.CORS_ALLOWED, flags.NEEDS_REFERER_HEADER],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};