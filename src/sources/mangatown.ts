import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { Source, SourceChaptersOutput, SourcePagesOutput } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
// import { toSnakeCase } from '@/utils/tocase';
import { NotFoundError } from '@/utils/errors';
import { unpack } from '@/utils/unpacker';

type SearchResponse = {
    query: string,
    suggestions: string[],
    data: string[]
}

function extractVar(script: string, varName: string): string | null {
    const re = new RegExp(
        `var\\s+${varName}\\s*=\\s*` +  // var varName =
        `(?:` +
        `"([^"]*)"|'([^']*)'|([\\d\\.]+)` + // value in double quotes or single quotes or number
        `)\\s*;`
    );
    const match = script.match(re);
    if (!match) return null;
    // match groups: match[1] = double quoted, match[2] = single quoted, match[3] = number
    return match[1] ?? match[2] ?? match[3] ?? null;
}

function extractImageFromApi(packedScript: string): string[] {
    const unpackedCodeRaw = unpack(packedScript);
    const unpackedCode = unpackedCodeRaw.replace(/\\'/g, "'");

    // 1. Extract the base URL assigned to `pix` inside dm5imagefun()
    const pixMatch = unpackedCode.match(/var\s+pix\s*=\s*["']([^"']+)["']/);
    if (!pixMatch) {
        throw new Error('Base URL (pix) not found in unpacked script');
    }
    const base = pixMatch[1];

    // 2. Extract the array assigned to `pvalue` inside dm5imagefun()
    const pvalueMatch = unpackedCode.match(/var\s+pvalue\s*=\s*\[([^\]]+)\]/);
    if (!pvalueMatch) {
        throw new Error('Image suffix array (pvalue) not found');
    }

    // 3. Parse the pvalue array entries, clean quotes and whitespace
    const rawItems = pvalueMatch[1]
        .split(',')
        .map(item => item.trim().replace(/^["']|["']$/g, ''));

    // 4. Build URLs based on the logic in dm5imagefun():
    const urls = rawItems.map((suffix, i) => {
        if (i === 0) {
            return base + suffix;
        } else {
            return base + suffix;
        }
    });

    return urls;
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

    const chapterId = extractVar(infoScripts, 'chapter_id');
    const totalPages = extractVar(infoScripts, 'total_pages')

    if (!chapterId || !totalPages) throw new NotFoundError('No required variables found in script block'); //fallback to scrape the pages manually?

    const apiBaseUrl = ctx.chapter.url + '/chapterfun.ashx';
    const pagePromises = [];
    for (let page = 1; page <= Number(totalPages); page++) {
        const params = new URLSearchParams({
            cid: chapterId,
            page: page.toString(),
            key: ''
        });
        const fullApiUrl = `${apiBaseUrl}?${params.toString()}`;

        pagePromises.push(ctx.proxiedFetcher(fullApiUrl));
    }

    const allApiResponses = await Promise.all(pagePromises);
    console.log(allApiResponses);
    const allImageUrls = allApiResponses.flatMap(apiRes => extractImageFromApi(apiRes));

    const uniqueUrls = Array.from(new Set(allImageUrls));

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