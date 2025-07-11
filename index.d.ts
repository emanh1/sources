import * as FormData_2 from 'form-data';

export declare type Chapter = {
    id: number;
    chapterTitle?: string;
    chapterVolume?: number;
    chapterNumber?: number;
    url: string;
    date?: string;
    sourceId: string;
};

declare type ChapterContext = ScrapeContext & {
    chapter: Chapter;
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

declare type FeatureMap = {
    requires: Flags[];
    disallowed: Flags[];
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

declare type FetchReply = {
    text(): Promise<string>;
    json(): Promise<any>;
    extraHeaders?: FetchHeaders;
    extraUrl?: string;
    headers: FetchHeaders;
    url: string;
    status: number;
};

export declare type Flags = (typeof flags)[keyof typeof flags];

export declare const flags: {
    readonly CORS_ALLOWED: "cors-allowed";
    readonly DYNAMIC_RENDER: "dynamic-render";
};

export declare function gatherAllSources(): Source[];

export declare function getSources(features: FeatureMap, list: Source[]): Source[];

export declare function makeFetcher(fetcher: Fetcher): UseableFetcher;

export declare function makeSimpleProxyFetcher(proxyUrl: string, f: FetchLike): Fetcher;

export declare function makeSources(ops: SourceMakerInput): SourceControls;

export declare function makeStandardFetcher(f: FetchLike): Fetcher;

export declare type Manga = {
    malId?: number;
    title: string;
    title_japanese?: string;
    title_english?: string;
};

declare type MangaContext = ScrapeContext & {
    manga: Manga;
    language?: string;
};

export declare class NotFoundError extends Error {
    constructor(reason?: string);
}

export declare type Page = {
    id: number;
    chapter: Chapter;
    url: string;
};

declare interface RunnerOptions {
    manga: Manga;
}

declare type ScrapeContext = {
    proxiedFetcher: UseableFetcher;
    fetcher: UseableFetcher;
};

declare type Source = {
    id: string;
    name: string;
    url: string;
    rank: number;
    disabled?: boolean;
    flags: Flags[];
    scrapeChapters: (input: MangaContext) => Promise<SourceChaptersOutput>;
    scrapePagesofChapter: (input: ChapterContext) => Promise<SourcePagesOutput>;
};

export declare type SourceChaptersOutput = Chapter[];

export declare interface SourceControls {
    runAll(runnerOps: RunnerOptions): Promise<Record<string, SourceChaptersOutput>>;
    runSourceForChapters(runnerOps: SourceRunnerOptions): Promise<SourceChaptersOutput>;
    runSourceForPages(runnerOps: SourcePageRunnerOptions): Promise<SourcePagesOutput>;
    listSources(): Source[];
}

export declare interface SourceMakerInput {
    fetcher: Fetcher;
    proxiedFetcher?: Fetcher;
    target: Targets;
}

declare interface SourcePageRunnerOptions {
    chapter: Chapter;
}

export declare type SourcePagesOutput = Page[];

declare interface SourceRunnerOptions {
    id: string;
    manga: Manga;
}

export declare type Targets = (typeof targets)[keyof typeof targets];

export declare const targets: {
    readonly BROWSER: "browser";
    readonly NATIVE: "native";
    readonly ANY: "any";
};

declare type UseableFetcher = {
    <T = any>(url: string, ops?: FetcherOptions): Promise<T>;
    full: <T = any>(url: string, ops?: FetcherOptions) => Promise<FetcherResponse<T>>;
};

export { }
