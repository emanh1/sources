import type { Chapter, ChapterContext, MangaContext, Page } from "@/utils/types";
import type { Source, SourceChaptersOutput, SourcePagesOutput } from "./base";

const baseUrl = "https://api.mangadex.org"

async function fetchChapters(manga: MangaContext): Promise<SourceChaptersOutput> {
    const search = await manga.fetcher('/manga', {
        baseUrl,
        query: {
            title: manga.title
        }
    })
    const chapterId = search.data[0].id; //1st search is the most likely to match
    const chaptersResponse = await manga.fetcher(`/manga/${chapterId}/feed`, {
        baseUrl
    });
    const chapters = chaptersResponse.data
        .filter((ch: any) => !manga.language || ch.attributes.translatedLanguage === manga.language)
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

async function fetchPages(chapter: ChapterContext): Promise<SourcePagesOutput> {
    const res = await chapter.fetcher(chapter.url);
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
    rank: 50,
    scrapeChapters: fetchChapters,
    scrapePagesofChapter: fetchPages
};

