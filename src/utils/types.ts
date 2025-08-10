export type Manga = {
    /** MangaDex ID */
    id?: string,
    title: string,
    altTitles: {
        en?: string,
        'ja-ro'?: string,
        'ko-ro'?: string,
        'zh-ro'?: string,
        [key: string]: string | undefined
    }
    originalLanguage: string,
    translatedLanguage: string
}

export type Chapter = {
    id: string,
    sourceId: string
    title?: string | null,
    volume?: string | null,
    chapterNumber?: string | null,
    url: string,
    date?: string,
}

export type Page = {
    id: number,
    url: string,
}