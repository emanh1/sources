import type { Chapter, Manga, Page } from "@/utils/types";
import type { MangaContext, ChapterContext, SearchContext } from "@/utils/context";
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from "@/sources/base";
import { flags } from "@/entrypoint/targets";
import type { components } from "./types";
import { NotFoundError } from "@/utils/errors";

const baseUrl = "https://api.mangadex.org"

type MangaList = components["schemas"]["MangaList"]
type ChapterResponse = components["schemas"]["ChapterList"]
type MDChapter = components["schemas"]["Chapter"]

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const search: MangaList = await ctx.fetcher('/manga', {
        baseUrl,
        query: {
            title: ctx.titleInput,
            "order[relevance]": "desc",
            "order[followedCount]": "desc",
        }
    })
    if (!search.data) throw new NotFoundError(`[MangaDex] No search results for ${ctx.titleInput}`)
    const mangaList: Manga[] = [];
    for (const manga of search?.data) {
        mangaList.push({
            id: manga.id,
            sourceId: 'mangadex',
            title: manga.attributes?.title?.en || manga.attributes?.title?.["ja-ro"] ||
                manga.attributes?.title?.["kr-ro"] || manga.attributes?.title?.["zh-ro"] || "Unknown",
            altTitles: manga.attributes?.altTitles,
            publicationDemographic: manga.attributes?.publicationDemographic,
            status: manga.attributes?.status,
            year: manga.attributes?.year,
            originalLanguage: manga.attributes?.originalLanguage,
            url: `https://mangadex.org/title/${manga.id}`
        })
    }
    return mangaList

}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const chapters: Chapter[] = [];
    const limit = 100;
    let offset = 0;
    let failed = false;

    async function safeFetch(offset: number, retries = 3, delay = 3500): Promise<ChapterResponse | null> {
        try {
            return await ctx.fetcher(`/manga/${ctx.manga.id}/feed`, {
                baseUrl,
                query: {
                    limit: String(limit),
                    offset: String(offset),
                    "order[publishAt]": "desc",
                    includeFuturePublishAt: "0",
                    includeExternalUrl: "0",
                    includeEmptyPages: "0",
                },
            });
        } catch (err: any) {
            if (retries > 0) {
                console.warn(`[MangaDex] fetch failed at offset=${offset}, retrying... (${3 - retries + 1})`);
                await new Promise(r => setTimeout(r, delay));
                return safeFetch(offset, retries - 1, delay * 2);
            }
            console.error(`[MangaDex] permanent failure at offset=${offset}`, err);
            return null; 
        }
    }

    while (true) {
        const resp = await safeFetch(offset);

        if (!resp || !resp.data || resp.data.length === 0) {
            if (!resp) failed = true;
            break;
        }

        chapters.push(...resp.data.map((ch: MDChapter) => ({
            id: ch.id ?? "no_id",
            sourceId: "mangadex",
            title: ch.attributes?.title,
            volume: ch.attributes?.volume,
            translatedLanguage: ch.attributes?.translatedLanguage,
            chapterNumber: ch.attributes?.chapter,
            date: ch.attributes?.publishAt,
            url: `${baseUrl}/at-home/server/${ch.id}`,
        })));

        offset += limit;
        await new Promise(r => setTimeout(r, 500)); //idk 
    }

    if (failed) {
        console.warn(`[MangaDex] returning partial results (${chapters.length} chapters)`);
    }

    return chapters;
}


async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const res = await ctx.fetcher(ctx.chapter.url);
    const base = res.baseUrl;
    const hash = res.chapter.hash;
    const files = res.chapter.data;

    const pages: Page[] = files.map((file: string, idx: number) => ({
        pageNumber: idx + 1,
        url: `${base}/data/${hash}/${file}`
    }));

    return pages;
}

export const mangaDexScraper: Source = {
    id: 'mangadex',
    name: 'MangaDex',
    url: baseUrl,
    rank: 4,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};

