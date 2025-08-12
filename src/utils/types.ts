export type Manga = {
    /* ID from source */
    id?: string,
    mangadex_id?: string,
    sourceId: string,
    title: string,
    altTitles?: { [key: string]: string }[],
    description?: string,
    coverUrl?: string,
    author?: string[],
    artist?: string[],
    publicationDemographic?: 'shounen' | 'shoujo' | 'josei' | 'seinen' | null,
    status?: 'completed' | 'ongoing' | 'hiatus' | 'cancelled'
    year?: number | null
    contentRating?: 'safe' | 'suggestive' | 'erotica' | 'pornographic',
    tags?: string[],
    originalLanguage?: string,
    url: string,
}

export type Chapter = {
    id: string,
    sourceId: string
    title?: string | null,
    volume?: string | null,
    translatedLanguage?: string, //ISO 639-1 + (https://en.wikipedia.org/wiki/IETF_language_tag)
    chapterNumber?: string | null,
    scanlationGroup?: string | null,
    uploader?: string | null,
    branch?: string
    url: string,
    date?: string,
}

export type Page = {
    id: number,
    url: string,
}