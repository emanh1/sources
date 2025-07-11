import type { FeatureMap } from "@/entrypoint/targets";
import type { UseableFetcher } from "@/fetchers/types";
import type { Source, SourceChaptersOutput } from "@/sources/base";
import type { ScrapeContext } from "@/utils/context";
import type { Chapter, Manga } from "@/utils/types";

export type RunAllOptions = {
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
    features: FeatureMap;
    manga: Manga;
}

export type RunOneOptions = {
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
    features: FeatureMap;
    manga: Manga;
    id: string;
}

export type RunPageOptions = {
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
    chapter: Chapter;
}

export async function runAllSourcesForChapters(sources: Source[], ops: RunAllOptions) {
    const results: Record<string, SourceChaptersOutput> = {};
    const contextBase: ScrapeContext = {
        fetcher: ops.fetcher,
        proxiedFetcher: ops.proxiedFetcher,

    }
    for (const src of sources) {
        try {
            results[src.id] = await src.scrapeChapters({
                ...contextBase,
                manga: ops.manga
            });
        } catch (err) {
            console.warn(`Error scraping chapters from ${src.id}:`, err);
        }
    }
    return results;
}
export async function runSourceForChapters(sources: Source[], ops: RunOneOptions) {
    const contextBase: ScrapeContext = {
        fetcher: ops.fetcher,
        proxiedFetcher: ops.proxiedFetcher
    }

    const source = sources.find(s => s.id === ops.id);
    if (!source) {
        throw new Error(`Source with id ${ops.id} not found`);
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


export async function fetchPagesFromSource(sources: Source[], ops: RunPageOptions) {
    const contextBase: ScrapeContext = {
        fetcher: ops.fetcher,
        proxiedFetcher: ops.proxiedFetcher
    }
    const src = sources.find(s => s.id === ops.chapter.sourceId);
    if (!src) {
        throw new Error(`Source ${ops.chapter.sourceId} not found.`);
    }
    return src.scrapePagesofChapter({
        ...contextBase,
        chapter: ops.chapter,
        sourceId: ops.chapter.sourceId
    });
}