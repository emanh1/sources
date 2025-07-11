import * as cheerio from 'cheerio';
import type { Chapter, ChapterContext, MangaContext, Page } from '@/utils/types';
import type { Source, SourceChaptersOutput, SourcePagesOutput } from '@/sources/base';
import { Element } from 'domhandler';
import { flags } from '@/entrypoint/targets';

const baseUrl = "https://fanfox.net";

function toSnakeCase(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_') // replace non-alphanumeric with underscores
        .replace(/^_+|_+$/g, ''); // trim leading and trailing underscores
}

async function fetchChapters(manga: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}/manga/${toSnakeCase(manga.title)}/`;
    const response = await manga.proxiedFetcher(url);
    const $ = cheerio.load(response.data);
    const chapters = getChapters($);
    return chapters;
}

function getChapters($: cheerio.CheerioAPI): Chapter[] {
    let chapterElements: Element[] = [];

    // Prioritize volumes first
    if ($('#list-2 ul.detail-main-list').length) {
        chapterElements = $('#list-2 ul.detail-main-list li a').toArray();
    }
    else if ($('#list-1 ul.detail-main-list').length) {
        chapterElements = $('#list-1 ul.detail-main-list li a').toArray();
    }
    else {
        // fallback if nothing is found
        chapterElements = $('.detail-main-list ul li a').toArray();
    }

    return chapterElements.flatMap((element) => {
        const $el = $(element);
        const url = $el.attr('href');
        if (!url) return [];

        const chapterId = url.split('/').pop() || '';
        const title = $el.find('.title3').text().trim();
        const date = $el.find('.title2').text().trim();

        // extract chapter number from title
        const match = title.match(/Ch\.(\d+(\.\d+)?)/) ||
                      title.match(/c(\d+(\.\d+)?)/);
        const number = match ? parseFloat(match[1]) : undefined;

        if (number === undefined) return [];

        return [{
            id: Number(chapterId),
            chapterNumber: number,
            date: date,
            url: baseUrl + url,
            sourceId: 'fanfox'
        } satisfies Chapter];
    });
}

async function getPages(chapter: ChapterContext): Promise<SourcePagesOutput> {
    const pages: Page[] = [];

    const response = await chapter.proxiedFetcher(chapter.url);
    const $ = cheerio.load(response.data);

    // Get the max page count first
    const pageLinks = $('.pager-list-left span a[data-page]');
    let maxPage = 1;

    pageLinks.each((_, el) => {
        const pageNum = parseInt($(el).attr('data-page') || '', 10);
        if (!isNaN(pageNum) && pageNum > maxPage) {
            maxPage = pageNum;
        }
    });

    // Now fetch each page individually to extract the image url
    for (let i = 1; i <= maxPage; i++) {
        const pageUrl = chapter.url?.replace(/(\d+)\.html/, `${i}.html`)!;
        let pageResponse = await chapter.proxiedFetcher(pageUrl);
        let $$ = cheerio.load(pageResponse.data);
        let imgEl = $$('.reader-main-img');
        let imgUrl = imgEl.attr('src') || '';
        if (imgUrl.startsWith('//')) {
            imgUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
            imgUrl = baseUrl + imgUrl;
        }
        
        // If it's a loading spinner, retry after a short delay
        let attempts = 0;
        while (imgUrl && imgUrl.toLowerCase().includes('loading') && attempts < 5) {
            await new Promise(r => setTimeout(r, 5000)); // wait 1sec
            pageResponse = await chapter.proxiedFetcher(pageUrl);
            $$ = cheerio.load(pageResponse.data);
            imgEl = $$('.reader-main-img');
            imgUrl = imgEl.attr('src') || '';
            if (imgUrl.startsWith('//')) {
                imgUrl = 'https:' + imgUrl;
            } else if (imgUrl.startsWith('/')) {
                imgUrl = baseUrl + imgUrl;
            }
            attempts++;
        }
        
        if (imgUrl && !imgUrl.toLowerCase().includes('loading')) {
            pages.push({ id: i - 1, url: imgUrl, chapter });
        }
    }
    return pages;
}

export const fanFoxSraper: Source = {
    id: 'fanfox',
    name: 'FanFox (MangaFox)',
    url: baseUrl,
    rank: 100,
    flags: [flags.CORS_ALLOWED, flags.DYNAMIC_RENDER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: getPages
}