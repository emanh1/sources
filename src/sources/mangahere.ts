// same site architecture as fanfox (??)

import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { Source, SourceChaptersOutput, SourcePagesOutput } from '@/sources/base';
import { Element } from 'domhandler';
import { flags } from '@/entrypoint/targets';
import { toSnakeCase } from '@/utils/tocase';
import { chapterFun, extractDm5KeyFromPacked, extractVarFromScript } from '@/utils/chapterfunashx';

const baseUrl = "https://www.mangahere.cc";

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
        const number = match ? match[1] : undefined;
        if (number === undefined) return [];

        return [{
            id: chapterId,
            sourceId: 'mangahere',
            chapterNumber: number,
            url: baseUrl + href,
            date,
        } satisfies Chapter];
    });
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const url = `${baseUrl}/manga/${toSnakeCase(ctx.manga.title)}/`;
    const response = await ctx.proxiedFetcher(url);
    const $ = cheerio.load(response);
    const chapters = parseChapters($);
    return chapters;
}

async function getPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);
    const scripts = $('script')
        .toArray()
        .filter(s => !$(s).attr('src'))
        .map(s => $(s).html() || '');
    //different order from fanfox
    const chapterid = extractVarFromScript(scripts[6], 'chapterid');
    const totalPages = extractVarFromScript(scripts[6], 'imagecount');
    console.log(scripts);
    const dm5_key = extractDm5KeyFromPacked(scripts[8]);

    if (!chapterid || !dm5_key || !totalPages) {
        throw new Error('[Fanfox] Missing required variables');
    }

    const fetchChapterPages = chapterFun(ctx, chapterid, totalPages, dm5_key);

    const uniqueUrls = await fetchChapterPages();

    return uniqueUrls.map((url, idx) => {
        const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https:${url}`;

        return {
            id: idx,
            url: normalizedUrl,
        };
    }) as Page[];

}

export const mangaHereScraper: Source = {
    id: 'mangahere',
    name: 'MangaHere',
    url: baseUrl,
    rank: 17,
    flags: [flags.CORS_ALLOWED, flags.NEEDS_REFERER_HEADER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: getPages
};