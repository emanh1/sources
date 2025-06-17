import type { Source, SourceChaptersOutput } from "./base";
import type { ChapterContext, MangaContext } from "@/utils/types";
import { mangaReadScraper } from "./mangaread";
import { mangaDexScraper } from "./mangadex";
import { manhuaBuddyScraper } from "./manhuabuddy";

export function gatherAllSources(): Array<Source> {
    return [
        mangaReadScraper,
        mangaDexScraper,
        manhuaBuddyScraper
    ].sort((a,b) => (a.rank ?? 0) - (b.rank ?? 0));
}

export async function runSourceForChapters(context: MangaContext, sourceId: string) {
    const sources = gatherAllSources();
    const source = sources.find(s => s.id === sourceId);
    if (!source) {
        throw new Error(`Source with id ${sourceId} not found`);
    } 
    try {
        const chapters = await source.scrapeChapters(context);
        return chapters;
    } catch (error) {
        throw error;
    }
}

export async function runAllSourcesForChapters(context: MangaContext) {
    const sources = gatherAllSources();
    const results: Record<string, SourceChaptersOutput> = {};

    for (const src of sources) {
        if (src.disabled) continue;
        try {
            results[src.id] = await src.scrapeChapters(context);
        } catch (err) {
            console.warn(`Error scraping chapters from ${src.id}:`, err);
        }
    }
    return results;
}

export async function fetchPagesFromSource(chapterContext: ChapterContext) {
    const sources = gatherAllSources();
    const src = sources.find(s => s.id === chapterContext.sourceId);
    if (!src) {
        throw new Error(`Source ${chapterContext.sourceId} not found.`);
    }
    return src.scrapePagesofChapter(chapterContext);
}


