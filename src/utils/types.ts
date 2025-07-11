import type { UseableFetcher } from "@/fetchers/types"

export type Manga = {
    malId?: number,
    title: string,
    title_japanese?: string,
    title_english?: string,
}

export type Chapter = {
    id: number,
    chapterTitle?: string,
    chapterVolume?: number,
    chapterNumber?: number
    url: string,
    date?: string,
    sourceId: string
}

export type Page = {
    id: number,
    chapter: Chapter
    url: string
}

export type MangaContext = Manga & {
    language?: string;
    fetcher: UseableFetcher,
    proxiedFetcher: UseableFetcher
}

export type ChapterContext = Chapter & {
    fetcher: UseableFetcher,
    proxiedFetcher: UseableFetcher
    sourceId: string
}