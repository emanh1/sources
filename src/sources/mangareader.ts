import { flags } from "@/entrypoint/targets";
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from "./base";
import type { ChapterContext, MangaContext, SearchContext } from "@/utils/context";
import type { Chapter, Manga, Page } from "@/utils/types";
import * as cheerio from 'cheerio';
import { NotFoundError } from "@/utils/errors";

const baseUrl = 'https://mangareader.to'

type ApiResponse = {
    status: boolean;
    html: string;
}

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const mangas: Manga[] = [];
    const response: ApiResponse = await ctx.proxiedFetcher(baseUrl + '/ajax/manga/search/suggest', {
        query: {
            keyword: ctx.titleInput
        }
    })
    if (!response.status) throw new Error('[MangaReader] error while serching manga');
    const $ = cheerio.load(response.html);
    const items = $('a.nav-item')
    items.each((i, el) => {
        if (i === items.length - 1) return; // skip last
        const href = $(el).attr('href');
        if (!href) return;
        const img = $(el).find('img.manga-poster-img').attr('src');
        const title = $(el).find('h3.manga-name').text().trim();

        mangas.push({
            sourceId: 'mangareader',
            title: title,
            coverUrl: img,
            url: baseUrl + href
        });
    });
    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const chapters: Chapter[] = [];
    const response = await ctx.proxiedFetcher(ctx.manga.url);
    const $ = cheerio.load(response);
    $('ul.lang-chapters').each((_, ul) => {
        const $ul = $(ul);
        const lang = $ul.attr('id')?.replace('-chapters', '');
        if (!lang) return;

        $ul.find('li.chapter-item').each((_, li) => {
            const $li = $(li);
            const number = $li.attr('data-number');
            const link = $li.find('a.item-link');
            const url = link.attr('href');
            if (!url) return;
            const title = link.attr('title');

            chapters.push(
                {
                    id: String(number),
                    title,
                    chapterNumber: String(number),
                    sourceId: 'mangareader',
                    url: baseUrl + url,
                    translatedLanguage: lang,

                }
            );
        });
    });

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const pages: Page[] = [];
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const $ = cheerio.load(response);
    const firstId = $('[data-reading-id]').first().attr('data-reading-id');
    if (!firstId) throw new NotFoundError('[MangaReader] cant find pages');
    const imagesResponse: ApiResponse = await ctx.proxiedFetcher(baseUrl + `/ajax/image/list/chap/${firstId}`);
    const $$ = cheerio.load(imagesResponse.html);
    $$('div.iv-card').each((i, el) => {
        const url = $$(el).attr('data-url');
        if (url) {
            pages.push({
                id: i,
                url: url
            });
        }
    });
    return pages
}



export const mangaReaderScraper: Source = {
    id: 'mangareader',
    name: 'MangaReader',
    url: baseUrl,
    rank: 24,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages,
}