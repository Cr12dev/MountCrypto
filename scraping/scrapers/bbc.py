import hashlib
from scrapers.base import BaseScraper
from models import Article, Source
from utils.filters import is_relevant


EXTRACT_JS = """
() => {
  const items = [];
  const seen = new Set();

  // BBC puts articles in containers with h2/h3 tags
  const containers = document.querySelectorAll('div[class*="Card"], div[class*="card"], section[class*="story"], li[class*="story"], a[class*="card"]');

  containers.forEach(el => {
    const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
    const href = linkEl ? linkEl.getAttribute('href') || '' : '';

    const titleEl = el.querySelector('h2, h3, h4');
    const title = titleEl ? titleEl.innerText.trim() : '';

    if (!title || seen.has(title)) return;
    seen.add(title);

    const summaryEl = el.querySelector('p');
    const summary = summaryEl ? summaryEl.innerText.trim() : '';

    const imgEl = el.querySelector('img');
    const imageUrl = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';

    items.push({ title, summary, link: href, image_url: imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl });
  });

  // Fallback: grab any h2+link combos that look like articles
  if (items.length === 0) {
    document.querySelectorAll('h2, h3').forEach(h => {
      const link = h.closest('a') || h.querySelector('a');
      const href = link ? link.getAttribute('href') || '' : '';
      const title = h.innerText.trim();
      if (title && !seen.has(title)) {
        seen.add(title);
        items.push({ title, summary: '', link: href, image_url: '' });
      }
    });
  }

  return items;
}
"""


class BBCScraper(BaseScraper):
    source = Source.BBC
    label = "BBC News"
    base_url = "https://www.bbc.com"

    CATEGORY_URLS = [
        "https://www.bbc.com/news/business",
        "https://www.bbc.com/news/technology",
        "https://www.bbc.com/news/world",
    ]

    def scrape(self) -> list[Article]:
        articles: list[Article] = []
        seen = set()

        for url in self.CATEGORY_URLS:
            items = self._fetch_playwright(url, extract_js=EXTRACT_JS)

            for item in items:
                text = f"{item.get('title', '')} {item.get('summary', '')}"
                if not is_relevant(text):
                    continue

                key = hashlib.md5(
                    (item.get("title", "") + item.get("link", "")).encode()
                ).hexdigest()[:12]
                if key in seen:
                    continue
                seen.add(key)

                articles.append(self._build_article(item, key))

        return articles
