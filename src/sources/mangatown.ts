import * as cheerio from 'cheerio';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { NotFoundError } from '@/utils/errors';
import { chapterFun, extractVarFromScript } from '@/utils/chapterfunashx';

const baseUrl = "https://www.mangatown.com";

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const searchUrl = `${baseUrl}/search`;
    const response = await ctx.proxiedFetcher(searchUrl, {
        query: {
            name: ctx.titleInput
        }
    })
    const $ = cheerio.load(response);
    const mangas: Manga[] = [];

    $('ul.manga_pic_list > li').each((_, el) => {
        const $el = $(el);

        const linkEl = $el.find('a.manga_cover');
        const url = linkEl.attr('href');
        if (!url) return ;
        const coverUrl = linkEl.find('img').attr('src') ?? undefined;
        const title = $el.find('p.title > a').attr('title') || $el.find('p.title > a').text().trim();
        const authorText = $el.find('p.view').filter((_, e) => $(e).text().startsWith('Author:')).text();
        const authorMatch = authorText.match(/Author:\s*(.+)/);
        const author = authorMatch ? [authorMatch[1].trim()] : undefined;
        const statusText = $el.find('p.view').filter((_, e) => $(e).text().startsWith('Status:')).text();
        const status = statusText.toLowerCase().includes('ongoing')
            ? 'ongoing'
            : statusText.toLowerCase().includes('completed')
                ? 'completed'
                : undefined;

        const tags: string[] = [];
        $el.find('p.keyWord a').each((_, tagEl) => {
            tags.push($(tagEl).text().trim());
        });

        mangas.push({
            sourceId: 'mangatown',
            title,
            url:`${baseUrl}${url}`,
            coverUrl,
            author,
            status,
            tags: tags.length > 0 ? tags : undefined,
        });
    });
    return mangas
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const $ = cheerio.load(await ctx.proxiedFetcher(ctx.manga.url));
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

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
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
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};