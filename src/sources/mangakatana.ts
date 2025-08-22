import { flags } from "@/entrypoint/targets";
import * as cheerio from 'cheerio';
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from "./base";
import type { ChapterContext, MangaContext, SearchContext } from "@/utils/context";
import type { Chapter, Manga, Page } from "@/utils/types";
import * as acorn from 'acorn';
import { NotFoundError } from "@/utils/errors";

const baseUrl = 'https://mangakatana.com'

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const response = await ctx.proxiedFetcher(baseUrl, {
        query: {
            search: encodeURIComponent(ctx.titleInput).replace(/%20/g, '+')
        }
    });
    const $ = cheerio.load(response);

    const mangas: Manga[] = [];
    const bodyText = $('body').text().toLowerCase();

    if (bodyText.includes('search results')) {
        $('#book_list .item').each((_, element) => {
            const el = $(element);

            const id = el.attr('data-id') ?? '';
            const titleEl = el.find('.title a').first();
            const title = titleEl.text().trim();
            const mangaUrl = titleEl.attr('href') ?? '';

            const coverUrl = el.find('.wrap_img a img').attr('src') ?? '';

            const statusText = el.find('.status').text().trim().toLowerCase();
            let status: Manga['status'] = undefined;
            if (statusText.includes('ongoing')) status = 'ongoing';
            else if (statusText.includes('completed')) status = 'completed';
            else if (statusText.includes('hiatus')) status = 'hiatus';
            else if (statusText.includes('cancelled')) status = 'cancelled';

            let description = el.find('.summary').html() ?? '';
            // Replace <br> with \n and remove other tags
            description = description.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '').trim();

            // Tags - genres text array
            const tags: string[] = [];
            el.find('.genres a').each((_, tagEl) => {
                tags.push($(tagEl).text().trim());
            });

            mangas.push({
                id,
                sourceId: 'mangakatana',
                title,
                description,
                coverUrl,
                status,
                tags,
                url: mangaUrl,
            });
        });

        return mangas;
    }
    //handle cases where input title is perfect, site redirects to details page
    const title = $('.info h1.heading').text().trim();

    const altNamesText = $('.meta .alt_name').text().trim();
    // Split alt names by ';' and trim, then convert to [{ "0": altName0 }, { "1": altName1 }, ...]
    const altTitles = altNamesText
        ? altNamesText
            .split(';')
            .map((name, idx) => ({ [idx.toString()]: name.trim() }))
            .filter(obj => Object.values(obj)[0] !== '')
        : undefined;

    const authors: string[] = [];
    $('.meta .authors a.author').each((_, el) => {
        authors.push($(el).text().trim());
    });

    const genres: string[] = [];
    $('.meta .genres a').each((_, el) => {
        genres.push($(el).text().trim());
    });

    const statusText = $('.meta .status').text().trim().toLowerCase();
    let status: Manga['status'] = undefined;
    if (statusText.includes('ongoing')) status = 'ongoing';
    else if (statusText.includes('completed')) status = 'completed';
    else if (statusText.includes('hiatus')) status = 'hiatus';
    else if (statusText.includes('cancelled')) status = 'cancelled';

    const description = $('.summary p').text().trim();
    const coverUrl = $('#single_book .cover img').attr('src') ?? '';
    let url = $('.download a.fc_bt.bt.transition').attr('href');
    if (!url) throw new NotFoundError(`[MangaKatana] can't find ${ctx.titleInput}`)
    if (url.endsWith('/fc')) {
        url = url.slice(0, -3);
    }

    mangas.push({
        sourceId: 'mangakatana',
        title,
        altTitles,
        author: authors.length > 0 ? authors : undefined,
        status,
        tags: genres.length > 0 ? genres : undefined,
        description: description || undefined,
        coverUrl: coverUrl || undefined,
        url,
    });
    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const response = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(response);
    const chapters = $(".uk-table tbody tr").map((i, el) => {
        const $row = $(el);
        const link = $row.find(".chapter a");
        const date = $row.find(".update_time").text().trim();

        const text = link.text().trim();

        const regex = /^(Chapter|Epilogue|Prologue|Special)?\s*([\d\.]+)?\:?\s*(.*)$/i;
        const match = text.match(regex);

        const label = match?.[1] ?? '';
        const chapterNumber = match?.[2] ?? '';
        const chapterTitle = match?.[3]?.trim() || '';

        // Compose title: 
        // If label exists and chapterNumber exists, "Chapter 85" + ": title" 
        // Else just label/title if no number (e.g. "Epilogue", "Prologue")
        let fullTitle = '';

        if (chapterNumber) {
            if (chapterTitle) fullTitle += `${chapterTitle}`;
        } else if (label) {
            fullTitle = label;
            if (chapterTitle) fullTitle += `: ${chapterTitle}`;
        } else {
            // fallback
            fullTitle = text;
        }

        return {
            id: chapterNumber || 'l' + String(i),
            sourceId: 'mangakatana',
            title: fullTitle,
            chapterNumber: chapterNumber || String(i),
            url: link.attr("href"),
            date: date,
        } as Chapter;
    }).get();
    return chapters;

}


async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const pages: Page[] = [];
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);
    const scripts = $('script[type="text/javascript"]').toArray();

    const targetScript = scripts.find(script =>
        $(script).html()!.includes('var ytaw') && $(script).html()!.includes('var thzq')
    );

    const scriptText = $(targetScript).html() || '';

    try {
        const ast = acorn.parse(scriptText, { ecmaVersion: 2020, sourceType: 'script' });

        // Traverse AST to find VariableDeclaration of 'thzq'
        let thzqArray: string[] | undefined;

        for (const node of (ast as any).body) {
            if (
                node.type === 'VariableDeclaration' &&
                node.declarations.length > 0 &&
                node.declarations[0].id.name === 'thzq'
            ) {
                // node.declarations[0].init contains the array node
                const arrayNode = node.declarations[0].init;
                if (arrayNode.type === 'ArrayExpression') {
                    thzqArray = arrayNode.elements.map((el: any) => el.value);
                }
                break;
            }
        }

        if (!thzqArray) throw new Error('[MangaKatana] thzq array not found in script');

        thzqArray.forEach((url, i) => {
            if (url && url.startsWith('http')) {
                pages.push({
                    id: i,
                    url,
                });
            }
        });
    } catch (err) {
        console.error('[MangaKatana] Error parsing script with acorn:', err);
    }

    return pages;
}


export const mangaKatanaScraper: Source = {
    id: 'mangakatana',
    name: 'MangaKatana',
    url: baseUrl,
    rank: 20,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};

