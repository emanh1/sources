import type { Chapter, ChapterContext, MangaContext, Page } from '@/utils/types';

export type SourceChaptersOutput = Chapter[];
export type SourcePagesOutput = Page[];

export type Source = { 
    id: string,
    name: string,
    url: string,
    rank: number,
    disabled?: boolean
    scrapeChapters: (input: MangaContext) => Promise<SourceChaptersOutput>,
    scrapePagesofChapter: (input: ChapterContext) => Promise<SourcePagesOutput>
}