// common functions to deal with this chaptefun.ashx api

import type { ChapterContext } from "./context";
import { unpack } from "./unpacker";

export function extractVarFromScript(script: string, varName: string): string | null {
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

export function extractDm5KeyFromPacked(script: string): string | null {
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


export function extractImageFromchapterfun(packedScript: string): string[] {
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

export function chapterFun(
    ctx: ChapterContext,
    chapterId: string,
    totalPages: string,
    dm5_key?: string
): () => Promise<string[]> {
    return async () => {
        let apiBaseUrl = ctx.chapter.url;

        if (/\d+\.html$/.test(apiBaseUrl)) {
            apiBaseUrl = apiBaseUrl.replace(/\/\d+\.html$/, '/chapterfun.ashx');
        } else {
            apiBaseUrl = apiBaseUrl.replace(/\/?$/, '/chapterfun.ashx');
        }

        const total = Number(totalPages);
        const fetcher = ctx.proxiedFetcher || ctx.fetcher;
        const pagePromises: Promise<any>[] = [];

        for (let page = 1; page <= total; page++) {
            const params = new URLSearchParams({
                cid: chapterId,
                page: page.toString(),
            });

            if (dm5_key) {
                params.set('key', dm5_key);
            }

            const fullApiUrl = `${apiBaseUrl}?${params.toString()}`;
            pagePromises.push(fetcher(fullApiUrl));
        }

        const allApiResponses = await Promise.all(pagePromises);
        const allImageUrls = allApiResponses.flatMap(apiRes => extractImageFromchapterfun(apiRes));
        const uniqueUrls = Array.from(new Set(allImageUrls));

        return uniqueUrls;
    };
}