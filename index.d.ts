import * as FormData_2 from 'form-data';
import { SourcePagesOutput } from './base';

declare type Chapter = {
    id: number;
    chapterTitle?: string;
    chapterVolume?: number;
    chapterNumber?: number;
    url: string;
    date?: string;
    sourceId: string;
};

declare type ChapterContext = Chapter & {
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
    sourceId: string;
};

export declare type DefaultedFetcherOptions = {
    baseUrl?: string;
    body?: Record<string, any> | string | FormData_2;
    headers: Record<string, string>;
    query: Record<string, string>;
    readHeaders: string[];
    method: 'HEAD' | 'GET' | 'POST';
    credentials?: 'include' | 'same-origin' | 'omit';
};

export declare type Fetcher = {
    <T = any>(url: string, ops: DefaultedFetcherOptions): Promise<FetcherResponse<T>>;
};

export declare type FetcherOptions = {
    baseUrl?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    method?: 'HEAD' | 'GET' | 'POST';
    readHeaders?: string[];
    body?: Record<string, any> | string | FormData_2 | URLSearchParams;
    credentials?: 'include' | 'same-origin' | 'omit';
};

export declare type FetcherResponse<T = any> = {
    statusCode: number;
    headers: Headers;
    finalUrl: string;
    body: T;
};

declare type FetchHeaders = {
    get(key: string): string | null;
    set(key: string, value: string): void;
};

declare type FetchLike = (url: string, ops?: FetchOps | undefined) => Promise<FetchReply>;

/**
 * This file is a very relaxed definition of the fetch api
 * Only containing what we need for it to function.
 */
declare type FetchOps = {
    headers: Record<string, string>;
    method: string;
    body: any;
    credentials?: 'include' | 'same-origin' | 'omit';
    signal?: any;
};

export declare function fetchPagesFromSource(chapterContext: ChapterContext): Promise<SourcePagesOutput>;

declare type FetchReply = {
    text(): Promise<string>;
    json(): Promise<any>;
    extraHeaders?: FetchHeaders;
    extraUrl?: string;
    headers: FetchHeaders;
    url: string;
    status: number;
};

export declare function gatherAllSources(): Array<Source>;

export declare function makeFetcher(fetcher: Fetcher): UseableFetcher;

export declare function makeSimpleProxyFetcher(proxyUrl: string, f: FetchLike): Fetcher;

export declare function makeStandardFetcher(f: FetchLike): Fetcher;

declare type Manga = {
    malId: number;
    title: string;
    title_japanese?: string;
    title_english?: string;
};

declare type MangaContext = Manga & {
    language?: string;
    fetcher: UseableFetcher;
    proxiedFetcher: UseableFetcher;
};

declare type Page = {
    id: number;
    chapter: Chapter;
    url: string;
};

export declare function runAllSourcesForChapters(context: MangaContext): Promise<Record<string, SourceChaptersOutput>>;

export declare function runSourceForChapters(context: MangaContext, sourceId: string): Promise<SourceChaptersOutput>;

declare type Source = {
    id: string;
    name: string;
    url: string;
    rank: number;
    disabled?: boolean;
    scrapeChapters: (input: MangaContext) => Promise<SourceChaptersOutput>;
    scrapePagesofChapter: (input: ChapterContext) => Promise<SourcePagesOutput_2>;
};

declare type SourceChaptersOutput = Chapter[];

declare type SourcePagesOutput_2 = Page[];

declare type UseableFetcher = {
    <T = any>(url: string, ops?: FetcherOptions): Promise<T>;
    full: <T = any>(url: string, ops?: FetcherOptions) => Promise<FetcherResponse<T>>;
};

export { }
