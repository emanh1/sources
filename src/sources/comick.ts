import type { ChapterContext, MangaContext, SearchContext } from "@/utils/context";
import type { Source, SourceChaptersOutput, SourceMangasOutput, SourcePagesOutput } from "./base";
import { flags } from "@/entrypoint/targets";
import type { Chapter, Manga, Page } from "@/utils/types";

const baseUrl = 'https://comick.io'
const apiUrl = 'https://api.comick.fun'

interface SearchResponse {
    id: number,
    hid: string,
    slug: string,
    title: string,
    rating: number | null,
    bayesian_rating: number | null,
    rating_count: number,
    follow_count: number,
    desc: string | null,
    status: number | null,
    last_chapter: number | null,
    translation_completed: boolean | null,
    view_count: number,
    content_rating: "safe" | "suggestive" | "erotica" | string,
    demographic: number | null,
    uploaded_at: string, // ISO date string
    genres: number[],
    created_at: string, // ISO date string
    user_follow_count: number,
    year: number,
    country: string,
    is_english_title: boolean | null,
    md_titles: {
        title: string,
    }[],
    md_covers: {
        w: number,
        h: number,
        b2key: string,
    }[],
    mu_comics: {
        year: number,
    } | null,
}

interface ChaptersResponse {
    chapters: {
        id: number,
        chap: string,
        title: string | null,
        vol: string | null,
        lang: string,
        created_at: string,
        updated_at: string,
        up_count: number,
        down_count: number,
        is_the_last_chapter: boolean,
        publish_at: string,
        group_name: string[],
        hid: string,
        identities: any,
        md_chapters_groups: any,
    }[],
    total: number,
    checkVol2Chap1: boolean,
    limit: number
}

interface PagesResponse {
    chapter: {
        images: { url: string }[]
    }
}

async function fetchMangas(ctx: SearchContext): Promise<SourceMangasOutput> {
    const response: SearchResponse[] = await ctx.fetcher(apiUrl + '/v1.0/search', {
        query: {
            q: ctx.titleInput,
            tachiyomi: 'true'
        },
        // headers: {
        //     "X-Origin": baseUrl,
        //     "X-Referer": baseUrl + '/'
        // }
    })
    const mangas: Manga[] = []
    for (const manga of response) {
        mangas.push({
            id: manga.hid,
            sourceId: 'comick',
            title: manga.title,
            altTitles: manga.md_titles,
            description: manga.desc ?? undefined,
            coverUrl: manga.md_covers[0] ? `https://meo.comick.pictures/${manga.md_covers[0].b2key}.jpg` : undefined,
            year: manga.year,
            originalLanguage: manga.country,
            url: baseUrl + `/comic/${manga.slug}`
        })
    }
    return mangas;
}

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
    const chapters: Chapter[] = [];
    let page = 1;
    let chaptersResponse: ChaptersResponse;

    do {
        chaptersResponse = await ctx.fetcher(`${apiUrl}/comic/${ctx.manga.id}/chapters`, {
            query: {
                tachiyomi: 'true',
                page: String(page),
            },
        });

        for (const chapter of chaptersResponse.chapters) {
            chapters.push({
                id: String(chapter.id),
                sourceId: 'comick',
                title: chapter.title ?? '',
                volume: chapter.vol ?? undefined,
                translatedLanguage: chapter.lang,
                chapterNumber: chapter.chap,
                scanlationGroup: chapter.group_name?.length
                    ? chapter.group_name.join(',')
                    : undefined,
                url: `${apiUrl}/chapter/${chapter.hid}`,
            });
        }

        page++;
    } while (chapters.length < chaptersResponse.total);

    return chapters;
}

async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
    const pages: Page[] = [];
    const pagesResponse: PagesResponse = await ctx.fetcher(ctx.chapter.url, {
        query: {
            tachiyomi: 'true'
        }
    });
    pagesResponse.chapter.images.forEach((el, i) => {
        pages.push({
            id: i,
            url: el.url
        })
    })
    return pages;
}
export const comicKScraper: Source = {
    id: 'comick',
    name: 'ComicK',
    url: baseUrl,
    rank: 21,
    flags: [flags.CORS_ALLOWED],
    scrapeMangas: fetchMangas,
    scrapeChapters: fetchChapters,
    scrapePages: fetchPages
};