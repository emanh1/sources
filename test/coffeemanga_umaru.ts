import { targets, makeSimpleProxyFetcher, makeSources, makeStandardFetcher } from "../src/index";

async function loadImageThroughProxy(imageUrl: string) {
  const response = await fetch(`http://localhost:3000?destination=${encodeURIComponent(imageUrl)}`, {
    headers: {
      'X-Referer': 'https://www.coffeemanga.art/',
    }
  });

  if (!response.ok) throw new Error(`Failed to fetch image ${imageUrl}`);

  const blob = await response.blob();
  const imageURL = URL.createObjectURL(blob);
  return imageURL;
}
import { sources, availableSources } from './source';

async function main() {

  const chapters = await sources.runSourceForChapters({
    manga: { malId: 1, title: 'Himouto! Umaru-chan' },
    id: 'coffeemanga',
  });
  console.log('Chapters:', chapters);
  const latest = await sources.runSourceForPages({
    chapter: chapters[0],
  });
  console.log('Pages:', latest);

  renderPages(latest);
}

async function renderPages(pages: any[]) {
  const container = document.getElementById('pages');
  if (!container) return;

  container.innerHTML = 'Loading images...';

  const imageBlobs = await Promise.all(pages.map((p) => loadImageThroughProxy(p.url)));

  container.innerHTML = imageBlobs.map(
    (src) => `<img src="${src}" style="max-width: 100%; margin-bottom: 1em;" />`
  ).join('');
}


main();
