import type { Flags } from '@/entrypoint/targets';
import type { Chapter, Manga, Page } from '@/utils/types';
import type { MangaContext, ChapterContext, SearchContext } from '@/utils/context';

export type SourceMangasOutput = Manga[];
export type SourceChaptersOutput = Chapter[];
export type SourcePagesOutput = Page[];

export type Source = { 
    id: string,
    name: string,
    url: string,
    rank: number,
    disabled?: boolean,
    flags: Flags[],
    scrapeMangas: (input: SearchContext) => Promise<SourceMangasOutput>
    scrapeChapters: (input: MangaContext) => Promise<SourceChaptersOutput>,
    scrapePages: (input: ChapterContext) => Promise<SourcePagesOutput>
}