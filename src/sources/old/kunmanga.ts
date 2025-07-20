// this have the same cdn as coffeemanga, but not sure if each site have the same public
// manga entries that exist on the other

import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from '@/sources/base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://www.kunmanga.online/";

async function fetchChapters(ctx: MangaContext): Promise<SourceChaptersOutput> {
  const url = `${baseUrl}manga/${toKebabCase(ctx.manga.title)}/`;
  const response = await ctx.proxiedFetcher(url);
  const $ = cheerio.load(response);

  const chapters: Chapter[] = [];

  $('.wp-manga-chapter').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a');
    const url = $a.attr('href') || '';
    const titleText = $a.text().trim();

    const date = $el.find('.chapter-release-date i').text().trim();

    const match = titleText.match(/chapter\s*([\d.]+)/i);
    const chapterNumber = match ? parseFloat(match[1]) : undefined;

    const idAttr = $a.attr('data-id');
    const chapterId = idAttr ? parseInt(idAttr, 10) : undefined;

    if (!url || chapterNumber === undefined || !chapterId) return;

    chapters.push({
      chapterId,
      chapterNumber,
      date,
      url,
      sourceId: 'kunmanga',
    });
  });

  return chapters;
}


async function fetchPages(ctx: ChapterContext): Promise<SourcePagesOutput> {
  const response = await ctx.proxiedFetcher(ctx.chapter.url);
  const $ = cheerio.load(response);

  const pages: Page[] = [];

  $('div.page-break img.wp-manga-chapter-img').each((i, el) => {
    const $img = $(el);
    let src = $img.attr('src')?.trim();
    if (src?.startsWith('//')) src = 'https:' + src;
    if (!src) return;

    pages.push({
      id: i,
      url: src,
      chapter: ctx.chapter,
    });
  });

  return pages;
}

export const kunmangaScraper: Source = {
  id: 'kunmanga',
  name: 'KunManga',
  url: baseUrl,
  rank: 7,
  disabled: true,
  flags: [flags.CORS_ALLOWED, flags.NEEDS_REFERER_HEADER],
  scrapeChapters: fetchChapters,
  scrapePagesofChapter: fetchPages
};
