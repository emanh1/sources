import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { Source, SourceChaptersOutput, SourcePagesOutput } from '@/sources/base';
import { Element } from 'domhandler';
import { flags } from '@/entrypoint/targets';
import { toSnakeCase } from '@/utils/tocase';
import { unpack } from '@/utils/unpacker';

const baseUrl = "https://fanfox.net";

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

function extractDm5KeyFromPacked(script: string): string | null {
    const unpacked = unpack(script).replace(/\\'/g, "'");
    // Try to find the assignment to guidkey
    const guidLineMatch = unpacked.match(/var\s+guidkey\s*=\s*(.*?);/);
    if (!guidLineMatch) return null;

    const expr = guidLineMatch[1];

    const parts = [...expr.matchAll(/['"]([a-fA-F0-9])['"]/g)].map(m => m[1]);

    if (parts.length === 0) return null;

    const key = parts.join('');
    return key;
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

    const chapterid = extractVar(scripts[1], 'chapterid');
    const totalPages = extractVar(scripts[1], 'imagecount');
    const dm5_key = extractDm5KeyFromPacked(scripts[3]);

    if (!chapterid || !dm5_key || !totalPages) {
        throw new Error('[Fanfox] Missing required variables');
    }

    const apiBaseUrl = ctx.chapter.url.replace(/\/\d+\.html$/, '/chapterfun.ashx');
    const pagePromises = [];

    for (let page = 1; page <= Number(totalPages); page++) {
        const params = new URLSearchParams({
            cid: chapterid,
            key: dm5_key,
            page: page.toString()
        });
        const fullApiUrl = `${apiBaseUrl}?${params.toString()}`;

        // Push the promise into the array
        pagePromises.push(ctx.proxiedFetcher(fullApiUrl));
    }

    const allApiResponses = await Promise.all(pagePromises);

    const allImageUrls = allApiResponses.flatMap(apiRes => extractImageFromApi(apiRes));

    const uniqueUrls = Array.from(new Set(allImageUrls));

    return uniqueUrls.map((url, idx) => {
        const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https:${url}`;

        return {
            id: idx,
            url: normalizedUrl,
            chapter: ctx.chapter,
        };
    }) as Page[];

}

export const fanFoxScraper: Source = {
    id: 'fanfox',
    name: 'FanFox (MangaFox)',
    url: baseUrl,
    rank: 16,
    flags: [flags.CORS_ALLOWED, flags.NEEDS_REFERER_HEADER],
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: getPages
};