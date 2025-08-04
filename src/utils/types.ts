export type Manga = {
    /** MangaDex ID */
    id?: string,
    title: string,
    title_japanese?: string,
    title_english?: string,
}

export type Chapter = {
    chapterId: number,
    chapterTitle?: string,
    chapterVolume?: number,
    chapterNumber?: number
    url: string,
    date?: string,
    sourceId: string
}

export type Page = {
    id: number,
    chapter: Chapter
    url: string
}