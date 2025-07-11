import type { Flags } from '@/entrypoint/targets';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';

export type SourceChaptersOutput = Chapter[];
export type SourcePagesOutput = Page[];

export type Source = { 
    id: string,
    name: string,
    url: string,
    rank: number,
    disabled?: boolean,
    flags: Flags[],
    scrapeChapters: (input: MangaContext) => Promise<SourceChaptersOutput>,
    scrapePagesofChapter: (input: ChapterContext) => Promise<SourcePagesOutput>
}