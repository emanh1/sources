import type { Fetcher } from '@/fetchers/types';
import { flagsAllowedInFeatures, getTargetFeatures, type FeatureMap, type Targets } from '@/entrypoint/targets';
import { gatherAllSources } from '@/sources/all';
import type { Source, SourceChaptersOutput, SourcePagesOutput } from '@/sources/base';
import { hasDuplicates } from '@/utils/predicates';
import type { Chapter, Manga } from '@/utils/types';
import { makeFetcher } from '@/fetchers/common';
import { fetchPagesFromSource, runAllSourcesForChapters, runSourceForChapters } from '@/runner/runner';

export interface SourceMakerInput {
    fetcher: Fetcher,
    proxiedFetcher?: Fetcher,
    target: Targets,
}

export interface RunnerOptions {
    manga: Manga
}

export interface SourceRunnerOptions {
    id: string,
    manga: Manga
}

export interface SourcePageRunnerOptions {
    chapter: Chapter
}

export interface SourceControls {
    // fetch chapters lists from all sources
    runAll(runnerOps: RunnerOptions): Promise<Record<string, SourceChaptersOutput>>;
    // fetch chapters list from specific source
    runSourceForChapters(runnerOps: SourceRunnerOptions): Promise<SourceChaptersOutput>;
    // fetch pages of a chapter (source origin included)
    runSourceForPages(runnerOps: SourcePageRunnerOptions): Promise<SourcePagesOutput>;

    listSources(): Source[];
}


export function getSources(features: FeatureMap, list: Source[]): Source[] {
    const sources = list.filter((v) => !v?.disabled);
    const anyDuplicateId = hasDuplicates(sources.map((v) => v.id));
    const anyDuplicateRank = hasDuplicates(sources.map((v) => v.rank));

    if (anyDuplicateId) throw new Error('Duplicate id found in sources');
    if (anyDuplicateRank) throw new Error('Duplicate rank found in sources');
    return sources.filter((s) => flagsAllowedInFeatures(features, s.flags));
}

export function makeSources(ops: SourceMakerInput): SourceControls {
    const features = getTargetFeatures(ops.target);
    const sources = [...gatherAllSources()];
    const list = getSources(features, sources);
    const fetcherOps = {
        fetcher: makeFetcher(ops.fetcher),
        proxiedFetcher: makeFetcher(ops.proxiedFetcher ?? ops.fetcher),
        features: features,
    }
    return {
        runAll(runnerOps) {
            return runAllSourcesForChapters(list, {
                ...fetcherOps,
                ...runnerOps,
            });
        },

        runSourceForChapters(runnerOps) {
            return runSourceForChapters(list, {
                ...fetcherOps,
                ...runnerOps,
            })
        },

        runSourceForPages(runnerOps) {
            return fetchPagesFromSource(list, {
                ...fetcherOps,
                ...runnerOps
            })
        },
        listSources() {
            return list;
        }
    }

}