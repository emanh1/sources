import type { UseableFetcher } from "@/fetchers/types"
import type { Chapter, Manga } from "./types";

export type ScrapeContext = {
    proxiedFetcher: UseableFetcher;
    fetcher: UseableFetcher;
}

export type MangaContext = ScrapeContext & {
    manga: Manga;
    language?: string;
}

export type ChapterContext = ScrapeContext & {
    chapter: Chapter;
    sourceId: string;
}