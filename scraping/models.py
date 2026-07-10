from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class Source(str, Enum):
    BBC = "bbc"
    WSJ = "wsj"
    NYT = "nytimes"
    ANTENA3 = "antena3"
    BILD = "bild"
    ECONOMIST = "economist"
    FT = "ft"


class Article(BaseModel):
    id: str
    source: Source
    title: str
    summary: str
    link: str
    published: datetime | None = None
    image_url: str | None = None
    topics: list[str] = []
    translated: bool = False


class ScrapeRequest(BaseModel):
    sources: list[Source] | None = None


class ScrapeResponse(BaseModel):
    articles: list[Article]
    total: int
    sources_scraped: list[str]


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
