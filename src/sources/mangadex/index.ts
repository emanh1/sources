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
    let offset = 0;
    let total = 0;

    do {
        const chaptersResponse: ChapterResponse = await ctx.fetcher(`/manga/${ctx.manga.id}/feed`, {
            baseUrl,
            query: {
                limit: "60",
                offset: String(offset),
            }
        });

        if (!chaptersResponse.data || !chaptersResponse.total) throw new NotFoundError(`[MangaDex] Can't find chapters for ${ctx.manga.title}`);

        chapters.push(...chaptersResponse.data.map((ch: MDChapter) => ({
            id: ch.id ?? 'no_id',
            sourceId: 'mangadex',
            title: ch.attributes?.title,
            volume: ch.attributes?.volume,
            translatedLanguage: ch.attributes?.translatedLanguage,
            chapterNumber: ch.attributes?.chapter,
            date: ch.attributes?.publishAt,
            url: `${baseUrl}/at-home/server/${ch.id}`,
        } satisfies Chapter)));

        total = chaptersResponse.total;
        offset += 60;
    } while (offset < total);

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

