import { targets, makeSimpleProxyFetcher, makeSources, makeStandardFetcher } from "../src/index";

async function loadImageThroughProxy(imageUrl: string) {
  const response = await fetch(`http://localhost:3000?destination=${encodeURIComponent(imageUrl)}`, {
    headers: {
      'X-Referer': 'https://fanfox.net',
      'X-User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0'
    }
  });

  if (!response.ok) throw new Error(`Failed to fetch image ${imageUrl}`);

  const blob = await response.blob();
  const imageURL = URL.createObjectURL(blob);
  return imageURL;
}

const proxyBase = 'https://simple-proxy-pnor.onrender.com';
const proxyBase2 = 'http://localhost:3000';
const fetcher = makeStandardFetcher(fetch);
const proxiedFetcher = makeSimpleProxyFetcher(proxyBase2, fetch);

const sources = makeSources({
  fetcher,
  proxiedFetcher,
  target: targets.BROWSER,
});

async function main() {
  const availableSources = sources.listSources();

  const chapters = await sources.runSourceForChapters({
    manga: { malId: 1, title: 'One Piece' },
    id: 'fanfox',
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
