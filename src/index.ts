export type { Fetcher, DefaultedFetcherOptions, FetcherOptions, FetcherResponse } from 'src/fetchers/types';
export { makeStandardFetcher } from 'src/fetchers/standardFetch';
export { makeSimpleProxyFetcher } from 'src/fetchers/simpleProxy';

export { runAllSourcesForChapters, fetchPagesFromSource, gatherAllSources } from 'src/sources/all';