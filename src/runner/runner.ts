import type { FeatureMap } from "@/entrypoint/targets";
import type { UseableFetcher } from "@/fetchers/types";
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from "@/sources/base";
import type { ScrapeContext } from "@/utils/context";
import type { Chapter, Manga } from "@/utils/types";

export type RunAllForMangasOptions = {
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
    features: FeatureMap;
    titleInput: string;
}

export type RunForMangasOptions = {
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
    features: FeatureMap;
    titleInput: string;
    sourceId: string;
}

export type RunForChaptersOptions = {
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
    manga: Manga;
}

export type RunForPagesOptions = {
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
    chapter: Chapter;
}

export async function runAllSourcesForMangas(sources: Source[], ops: RunAllForMangasOptions):
    Promise<Record<string, SourceMangasOutput>> {
    const results: Record<string, SourceMangasOutput> = {};
    const contextBase: ScrapeContext = {
        fetcher: ops.fetcher,
        proxiedFetcher: ops.proxiedFetcher
    }
    for (const src of sources) {
        try {
            results[src.id] = await src.scrapeMangas({
                ...contextBase,
                titleInput: ops.titleInput
            });
        } catch (err) {
            console.warn(`Error scraping mangas from ${src.id}:`, err);
        }
    }
    return results;
}

export async function runSourceForMangas(sources: Source[], ops: RunForMangasOptions):
    Promise<SourceMangasOutput> {
    const contextBase: ScrapeContext = {
        fetcher: ops.fetcher,
        proxiedFetcher: ops.proxiedFetcher
    }
    const source = sources.find(s => s.id === ops.sourceId);
    if (!source) {
        throw new Error(`Source with id ${ops.sourceId} not found`);
    }
    try {
        const mangas = await source.scrapeMangas({
            ...contextBase,
            titleInput: ops.titleInput
        })
        return mangas
    } catch (error) {
        throw error;
    }

}

export async function runSourceForChapters(sources: Source[], ops: RunForChaptersOptions):
    Promise<SourceChaptersOutput> {
    const contextBase: ScrapeContext = {
        fetcher: ops.fetcher,
        proxiedFetcher: ops.proxiedFetcher
    }

    const source = sources.find(s => s.id === ops.manga.sourceId);
    if (!source) {
        throw new Error(`Source with id ${ops.manga.sourceId} not found`);
    }
    try {
        const chapters = await source.scrapeChapters({
            ...contextBase,
            manga: ops.manga
        });
        return chapters;
    } catch (error) {
        throw error;
    }
}

export async function runSourceForPages(sources: Source[], ops: RunForPagesOptions):
    Promise<SourcePagesOutput> {
    const contextBase: ScrapeContext = {
        fetcher: ops.fetcher,
        proxiedFetcher: ops.proxiedFetcher
    }
    const src = sources.find(s => s.id === ops.chapter.sourceId);
    if (!src) {
        throw new Error(`Source ${ops.chapter.sourceId} not found.`);
    }
    return src.scrapePages({
        ...contextBase,
        chapter: ops.chapter,
    });
}