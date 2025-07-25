import type { Source } from "./base";
import { mangaReadScraper } from "./mangaread";
import { mangaDexScraper } from "./mangadex";
import { manhuaBuddyScraper } from "./manhuabuddy";
import { manganatoScraper } from "./manganato";
import { fanFoxScraper } from "./fanfox";
import { readmangaScraper } from "./readmanga";
import { coffeemangaScraper } from "./old/coffeemanga";
import { kunmangaScraper } from "./old/kunmanga";
import { mangackScraper } from "./mangack";
import { mangaTaroScraper } from "./mangataro";
import { novaMangaScraper } from "./novamanga";
import { readMangaSeriesScraper } from "./readmangaseries";
import { mangaparkScraper } from "./mangapark";
import { mangasekaiScraper } from "./mangasekai";
import { mangaoiScraper } from "./mangaoi";
import { zinmangaxScraper } from "./zinmangax";

export function gatherAllSources(): Source[] {
    return [
        mangaReadScraper,
        mangaDexScraper,
        manhuaBuddyScraper,
        manganatoScraper,
        fanFoxScraper,
        readmangaScraper,
        coffeemangaScraper,
        kunmangaScraper,
        mangackScraper,
        mangaTaroScraper,
        novaMangaScraper,
        readMangaSeriesScraper,
        mangaparkScraper,
        mangasekaiScraper,
        mangaoiScraper,
        zinmangaxScraper
    ].sort((a,b) => (a.rank ?? 0) - (b.rank ?? 0));
}