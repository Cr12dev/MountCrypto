import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/api/news";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const uuid = searchParams.get("uuid");

  try {
    const articles = await fetchNews(category);

    if (uuid) {
      const article = articles.find((a) => a.uuid === uuid);
      if (!article) {
        return NextResponse.json({ error: "Article not found" }, { status: 404 });
      }
      return NextResponse.json(article);
    }

    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
