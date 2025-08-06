import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { Source, SourceChaptersOutput, SourcePagesOutput } from '@/sources/base';
import { Element } from 'domhandler';
import { flags } from '@/entrypoint/targets';
import { toSnakeCase } from '@/utils/tocase';

const baseUrl = "https://fanfox.net";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}/manga/${toSnakeCase(ctx.manga.title)}/`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);
    const chapters = parseChapters($);
    return chapters;
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

        const chapterId = href.split('/').pop() || '';
        const title = $el.find('.title3').text().trim();
        const date = $el.find('.title2').text().trim();

        const match = title.match(/Ch\.(\d+(\.\d+)?)/i) || title.match(/c(\d+(\.\d+)?)/i);
        const number = match ? parseFloat(match[1]) : undefined;
        if (number === undefined) return [];

        return [{
            chapterId: Number(chapterId),
            chapterNumber: number,
            date,
            url: baseUrl + href,
            sourceId: 'fanfox'
        } satisfies Chapter];
    });
}

async function getPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url, {useBrowser: true});

    const $ = cheerio.load(response);
    const pages: Page[] = [];

    const pageLinks = $('.pager-list-left span a[data-page]');
    let maxPage = 1;
    pageLinks.each((_, el) => {
        const n = parseInt($(el).attr('data-page') || '', 10);
        if (!isNaN(n)) maxPage = Math.max(maxPage, n);
    });
    //SLOW!!!
    for (let i = 1; i <= maxPage; i++) {
        const pageUrl = ctx.chapter.url.replace(/(\d+)\.html/, `${i}.html`);
        let pageData = await ctx.proxiedFetcher(pageUrl, {useBrowser: true});
        let $$ = cheerio.load(pageData);
        let imgEl = $$('.reader-main-img');
        let imgUrl = imgEl.attr('src') || '';

        if (imgUrl.startsWith('//')) {
            imgUrl = 'https:' + imgUrl;
        } else if (imgUrl.startsWith('/')) {
            imgUrl = baseUrl + imgUrl;
        }

        if (imgUrl && !imgUrl.toLowerCase().includes('loading')) {
            pages.push({
                id: i - 1,
                url: imgUrl,
                chapter: ctx.chapter
            });
        }
    }

    return pages;
}

export const fanFoxScraper: Source = {
    id: 'fanfox',
    name: 'FanFox (MangaFox)',
    url: baseUrl,
    rank: 100,
    flags: [flags.CORS_ALLOWED, flags.DYNAMIC_RENDER, flags.NEEDS_REFERER_HEADER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: getPages
};

