import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("https://timberprocoatingsusa.com/")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
    }

    const html = await res.text();

    // Extract H1 (product name)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const name = h1Match ? h1Match[1].replace(/&amp;/g, "&") : "";

    // Extract product image (from the product uploads folder)
    const imgMatch = html.match(
      /(https:\/\/cdn\.prod\.website-files\.com\/6883fdbb5812fc399ce753da\/[^"'\s)]+\.(?:jpg|jpeg|png|webp))(?!-p-)/
    );
    const image = imgMatch ? imgMatch[1] : "";

    // Extract description from first long paragraph
    const descMatch = html.match(/<p[^>]*>([^<]{50,})<\/p>/);
    const description = descMatch ? descMatch[1].slice(0, 300) : "";

    // Extract price
    const priceMatch = html.match(/\$[\d,.]+/);
    const price = priceMatch ? priceMatch[0] : "";

    return NextResponse.json({ name, image, description, price, url });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
