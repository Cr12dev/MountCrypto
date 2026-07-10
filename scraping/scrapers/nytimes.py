import hashlib
from scrapers.base import BaseScraper
from models import Article, Source
from utils.filters import is_relevant


EXTRACT_JS = """
() => {
  const items = [];
  const seen = new Set();

  const storyEls = document.querySelectorAll('li[class*="story"], div[class*="story"], article, a[class*="story"]');

  storyEls.forEach(el => {
    const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
    const href = linkEl ? linkEl.getAttribute('href') || '' : '';

    const titleEl = el.querySelector('h2, h3, h4, [class*="headline"]');
    let title = titleEl ? titleEl.innerText.trim() : '';
    if (!title) {
      const aText = linkEl ? linkEl.innerText.trim() : '';
      if (aText) title = aText;
    }

    if (!title || seen.has(title)) return;
    seen.add(title);

    const summaryEl = el.querySelector('p, [class*="summary"]');
    const summary = summaryEl ? summaryEl.innerText.trim() : '';

    const imgEl = el.querySelector('img');
    const imageUrl = imgEl ? (imgEl.getAttribute('src') || '') : '';

    items.push({ title, summary, link: href, image_url: imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl });
  });

  return items;
}
"""


class NYTScraper(BaseScraper):
    source = Source.NYT
    label = "The New York Times"
    base_url = "https://www.nytimes.com"

    CATEGORY_URLS = [
        "https://www.nytimes.com/section/business",
        "https://www.nytimes.com/section/business/economy",
        "https://www.nytimes.com/section/technology",
    ]

    def scrape(self) -> list[Article]:
        articles: list[Article] = []
        seen = set()

        for url in self.CATEGORY_URLS:
            items = self._fetch_playwright(url, timeout=35000, extract_js=EXTRACT_JS)

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
