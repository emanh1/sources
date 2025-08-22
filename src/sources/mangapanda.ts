import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { NotFoundError } from '@/utils/errors';

const baseUrl = "https://www.mangapanda.in";

type SearchResponse = {
    value: string,
    label: string,
    thumbnail: string,
    link: string,
}

function extractMangaIdFromScript(script: string): string | null {
    const match = script.match(/var\s+mangaID\s*=\s*['"](\d+)['"]/i);
    if (match) {
        return match[1]; // e.g., "6"
    }
    return null;
}

function extractChapterNumber(title: string): string | undefined {
    const match = title.match(/Chapter\s+([\d.]+)/i);
    return match ? match[1] : undefined;
}

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const mangas: Manga[] = [];
    const url = `${baseUrl}/search-autocomplete`
    const response: SearchResponse[] = JSON.parse(await ctx.proxiedFetcher(url, {
        query: {
            term: ctx.titleInput
        }
    }))
    for (const item of response) {
        try {
            mangas.push({
                sourceId: 'mangapanda',
                title: item.label,
                url: item.link,
                coverUrl: item.thumbnail
            })
        } catch (error) {
            console.warn(`[MangaPanda] ${error}`)
        }
    }
    return mangas
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(response);

    const scripts = $('script')
        .toArray()
        .filter(s => !$(s).attr('src'))
        .map(s => $(s).html() || '');
    const mangaId = extractMangaIdFromScript(scripts[3]);

    if (!mangaId) {
        throw new Error('Unable to extract mangaId from scripts');
    }

    const ajaxUrl = `${baseUrl}/ajax-list-chapter?mangaID=${mangaId}`;
    const chapterHtml = await ctx.proxiedFetcher(ajaxUrl);
    const $$ = cheerio.load(chapterHtml);

    const chapters: Chapter[] = [];

    $$('ul li').each((i, el) => {
        const a = $$(el).find('a');
        const title = a.text().trim();
        const href = a.attr('href');

        if (href) {
            chapters.push({
                id: extractChapterNumber(title) ?? 'l' + String(i),
                sourceId: 'mangapanda',
                title,
                chapterNumber: extractChapterNumber(title) ?? "",
                url: href.startsWith('http') ? href : `${baseUrl}${href}`,
            });
        }
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);
    const raw = $('#arraydata').text().trim();

    if (!raw) throw new NotFoundError('No pages url found');
    const urls = [...new Set(raw.split(',').map(url => url.trim()))];

    return urls.map((url, index) => ({
        id: index,
        url: url.startsWith('http') ? url : `https:${url}`,
    })) as Page[];

}

export const mangaPandaScraper: Source = {
    id: 'mangapanda',
    name: 'MangaPanda',
    url: baseUrl,
    rank: 18,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};