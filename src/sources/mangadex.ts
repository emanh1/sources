import type { Chapter, Page } from "@/utils/types";
import type { MangaContext, ChapterContext } from "@/utils/context";
import type { Source, SourceChaptersOutput, SourcePagesOutput } from "./base";
import { flags } from "@/entrypoint/targets";

const baseUrl = "https://api.mangadex.org"

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const search = await ctx.fetcher('/manga', {
        baseUrl,
        query: {
            title: ctx.manga.title
        }
    })
    const chapterId = search.data[0].id; //1st search is the most likely to match
    const chaptersResponse = await ctx.fetcher(`/manga/${chapterId}/feed`, {
        baseUrl
    });
    const chapters = chaptersResponse.data
        .filter((ch: any) => !ctx.language || ch.attributes.translatedLanguage === ctx.language)
        .map((ch: any) => ({
            id: ch.id,
            chapterNumber: Number(ch.attributes.chapter),
            chapterTitle: ch.attributes.title,
            chapterVolume: Number(ch.attributes.volume),
            date: ch.attributes.publishAt,
            url: `${baseUrl}/at-home/server/${ch.id}`,
            sourceId: 'mangadex'
        } satisfies Chapter));
    console.log(chapters);
    return chapters
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
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};

