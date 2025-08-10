import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { Source, SourceChaptersOutput, SourcePagesOutput } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
// import { toSnakeCase } from '@/utils/tocase';
import { NotFoundError } from '@/utils/errors';
import { chapterFun, extractVarFromScript } from '@/utils/chapterfunashx';

type SearchResponse = {
    query: string,
    suggestions: string[],
    data: string[]
}

const baseUrl = "https://www.mangatown.com";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const searchUrl = `${baseUrl}/ajax/search/`;
    const response: SearchResponse = JSON.parse(await ctx.proxiedFetcher(searchUrl, {
        query: {
            query: ctx.manga.title
        }
    }));
    console.log(response);
    if (response.data.length == 0) {
        throw new NotFoundError(`[MangaTown] cant find anything with query ${ctx.manga.title}`)
    }
    let exactIndex = response.suggestions.findIndex(
        s => s.toLowerCase() === response.query.toLowerCase()
    );
    if (exactIndex === -1) {
        exactIndex = 0;
    }
    const mangaUrl = baseUrl + response.data[exactIndex];
    const $ = cheerio.load(await ctx.proxiedFetcher(mangaUrl));
    const chapters: Chapter[] = [];
    $('ul.chapter_list > li').each((i, li) => {
        const $li = $(li);

        const $a = $li.find('a').first();

        const url = $a.attr('href')?.trim() ?? '';
        if (!url) return; // skip if no URL

        const parts = url.split('/').filter(Boolean);
        const id = parts[parts.length - 1] || String(i);

        const titleRaw = $a.text().trim();
        // Sometimes the title has extra spaces, normalize it
        const title = titleRaw.replace(/\s+/g, ' ');

        const volumePart = parts.find(part => /^v\d+$/i.test(part));
        const volume = volumePart ? volumePart : null

        const chapterPart = parts.find(part => /^c\d+(\.\d+)?$/i.test(part));
        let chapterNumber: string | null = null;
        if (chapterPart) {
            // Remove the leading 'c' and keep the rest (e.g. "010.5")
            chapterNumber = chapterPart.substring(1);
        }

        // Fallback
        if (!chapterNumber) {
            chapterNumber = $a.attr('name') || null;
        }

        const dateRaw = $li.find('span.time').text().trim() || null;

        chapters.push({
            id,
            sourceId: 'mangatown',
            title,
            volume,
            chapterNumber,
            url: baseUrl + url,
            date: dateRaw || undefined,
        });
    });

    return chapters;
}

async function getPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);
    const scripts = $('script')
        .toArray()
        .filter(s => !$(s).attr('src'))
        .map(s => $(s).html() || '');
    const infoScripts = scripts[4];

    const chapterId = extractVarFromScript(infoScripts, 'chapter_id');
    const totalPages = extractVarFromScript(infoScripts, 'total_pages')

    if (!chapterId || !totalPages) throw new NotFoundError('No required variables found in script block'); //fallback to scrape the pages manually?

    const fetchChapterPages = chapterFun(ctx, chapterId, totalPages);

    const uniqueUrls = await fetchChapterPages();

    return uniqueUrls.map((url, idx) => {
        const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https:${url}`;
        return {
            id: idx,
            url: normalizedUrl,
        };
    }) as Page[];

}

export const mangaTownScraper: Source = {
    id: 'mangatown',
    name: 'MangaTown',
    url: baseUrl,
    rank: 19,
    flags: [flags.CORS_ALLOWED, flags.NEEDS_REFERER_HEADER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: getPages
};