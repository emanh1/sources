import { flags } from "@/entrypoint/targets"
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from "./base"
import type { ChapterContext, MangaContext, SearchContext } from "@/utils/context"
import type { Chapter, Manga, Page } from "@/utils/types"

const baseUrl = 'https://backend.mangahaven.net'

type MangaResponse = {
    id: string;
    image: string;
    title: string;
    //we don't need below
    type: string;
    recentChapters: {
        id: string;
        chapter: string;
        lang: string;
        airedAt: string; // ISO date string or date string
    }[];
    recentVolumes: {
        id: string;
        chapter: string;
        lang: string;
        airedAt: string;
    }[];
}[];

type ChapterResponse = {
    id: string;
    lang: string; //always uppercase..?
    chapter: string;
    title: string;
}[]

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const mangas: Manga[] = [];
    const response: MangaResponse = await ctx.proxiedFetcher(baseUrl + '/filter', {
        query: {
            keyword: ctx.titleInput,
            sort: 'most_favourited'
        }
    })
    for (const manga of response) {
        mangas.push({
            id: manga.id,
            sourceId: 'mangahaven',
            title: manga.title,
            coverUrl: manga.image,
            url: baseUrl + `/chapters-with-ids/${manga.id}`
        })
    }
    return mangas
}


async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const chapters: Chapter[] = [];
    const response: ChapterResponse = await ctx.proxiedFetcher(ctx.manga.url);
    //we get en chapters for now...
    for (const chapter of response) {
        chapters.push({
            id: chapter.id,
            sourceId: 'mangahaven',
            title: chapter.title,
            chapterNumber: chapter.chapter,
            translatedLanguage: chapter.lang,
            url: baseUrl + `/read/${chapter.id}`
        })
    }
    return chapters;
}


async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const response = await ctx.proxiedFetcher(ctx.chapter.url);
    const pages: Page[] = response.map((url: string, index: number) => ({
        id: index.toString(),
        url: baseUrl + '/proxy-image?url=' + url
    }));
    return pages;
}

export const mangaHavenScraper: Source = {
    id: 'mangahaven',
    name: 'MangaHaven',
    url: baseUrl,
    rank: 23,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
}