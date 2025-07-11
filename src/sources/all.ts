import type { Source } from "./base";
import { mangaReadScraper } from "./mangaread";
import { mangaDexScraper } from "./mangadex";
import { manhuaBuddyScraper } from "./manhuabuddy";
import { manganatoScraper } from "./manganato";

export function gatherAllSources(): Source[] {
    return [
        mangaReadScraper,
        mangaDexScraper,
        manhuaBuddyScraper,
        manganatoScraper
    ].sort((a,b) => (a.rank ?? 0) - (b.rank ?? 0));
}