export type { Fetcher, DefaultedFetcherOptions, FetcherOptions, FetcherResponse } from '@/fetchers/types';
export { makeStandardFetcher } from '@/fetchers/standardFetch';
export { makeSimpleProxyFetcher } from '@/fetchers/simpleProxy';

export { runAllSourcesForChapters, runSourceForChapters, fetchPagesFromSource, gatherAllSources } from '@/sources/all';