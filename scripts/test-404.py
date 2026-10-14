"""Dependency-free regression checks: python3 scripts/test-404.py."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import unittest

ROOT = Path(__file__).resolve().parent.parent


class Tags(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class NotFoundPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tags = Tags((ROOT / "404.html").read_text()).tags

    def test_assets_resolve_at_every_missing_url_depth(self):
        assets = [attrs[key] for tag, attrs in self.tags
                  for key in ["href" if tag == "link" else "src"]
                  if tag in {"link", "img", "script"} and key in attrs]
        self.assertTrue(assets)
        for missing in ["/missing", "/missing/", "/nl/missing/",
                        "/nl/guide/missing.html", "/nl/guide/missing/"]:
            for asset in assets:
                with self.subTest(missing=missing, asset=asset):
                    self.assertTrue(asset.startswith("/") and not asset.startswith("//"))
                    resolved = urlsplit(urljoin("https://loudscript.app" + missing, asset))
                    self.assertEqual(resolved.netloc, "loudscript.app")
                    self.assertTrue((ROOT / resolved.path.lstrip("/")).is_file())

    def test_error_page_remains_noindex_without_redirect(self):
        robots = [a.get("content") for t, a in self.tags
                  if t == "meta" and a.get("name") == "robots"]
        self.assertEqual(robots, ["noindex, follow"])
        self.assertFalse(any(t == "meta" and a.get("http-equiv", "").lower() == "refresh"
                             for t, a in self.tags))
        sitemap = (ROOT / "sitemap.xml").read_text()
        self.assertNotIn("<loc>https://loudscript.app/404.html</loc>", sitemap)

    def test_homepage_recovery_link_is_root_relative(self):
        links = [a.get("href") for t, a in self.tags
                 if t == "a" and a.get("class") == "home-link"]
        self.assertEqual(links, ["/"])
        self.assertTrue((ROOT / "index.html").is_file())


if __name__ == "__main__":
    unittest.main()
