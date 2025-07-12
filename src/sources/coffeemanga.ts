import * as cheerio from 'cheerio';
import type { Chapter, Page } from '@/utils/types';
import type { MangaContext, ChapterContext } from '@/utils/context';
import type { SourceChaptersOutput, SourcePagesOutput } from './base';
import type { Source } from '@/sources/base';
import { flags } from '@/entrypoint/targets';
import { toKebabCase } from '@/utils/tocase';

const baseUrl = "https://www.coffeemanga.art/";

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
      id: chapterId,
      chapterNumber,
      date,
      url,
      sourceId: 'coffeemanga',
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

export const coffeemangaScraper: Source = {
  id: 'coffeemanga',
  name: 'CoffeeManga',
  url: baseUrl,
  rank: 6,
  flags: [flags.CORS_ALLOWED, flags.NEEDS_REFERER_HEADER],
  // something like this
  // async function loadImageThroughProxy(imageUrl: string) {
  //   const response = await fetch(`http://localhost:3000?destination=${encodeURIComponent(imageUrl)}`, {
  //     headers: {
  //       'X-Referer': 'https://www.coffeemanga.art/',
  //       'X-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0'
  //     }
  //   });

  //   if (!response.ok) throw new Error(`Failed to fetch image ${imageUrl}`);

  //   const blob = await response.blob();
  //   const imageURL = URL.createObjectURL(blob);
  //   return imageURL;
  // }
  scrapeChapters: fetchChapters,
  scrapePagesofChapter: fetchPages
};
