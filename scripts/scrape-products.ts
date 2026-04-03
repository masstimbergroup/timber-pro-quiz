// scripts/scrape-products.ts
// Run with: npx tsx scripts/scrape-products.ts

import { PRODUCT_MAP } from "../lib/products";

interface ScrapedProduct {
  sheetName: string;
  slug: string;
  url: string;
  badge: string;
  name: string;
  description: string;
  image: string;
  price: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

async function scrapeProduct(url: string): Promise<{ name: string; description: string; image: string; price: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} for ${url}`);
      return null;
    }
    const html = await res.text();

    // 1. Product name: <h1> tag
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const name = h1Match ? decodeHtmlEntities(stripHtmlTags(h1Match[1])) : "";

    // 2. Description: find <p> tags that contain real product description text.
    //    The page has nav/menu content in early <p> tags, so we look for the first
    //    substantial paragraph that appears AFTER the <h1> in the HTML.
    let description = "";
    if (h1Match && h1Match.index !== undefined) {
      const afterH1 = html.slice(h1Match.index);
      const paragraphs = afterH1.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g);
      for (const match of paragraphs) {
        const text = decodeHtmlEntities(stripHtmlTags(match[1])).replace(/\s+/g, " ").trim();
        // Skip short text, nav items, "Tech Info" labels, etc.
        if (text.length > 60 && !text.startsWith("Shop by") && !text.startsWith("Welcome to")) {
          description = text;
          break;
        }
      }
    }

    // 3. Product image: find img with cdn.prod.website-files.com that uses class="image-fit"
    //    and is NOT an SVG (the logo is SVG). Product photos are jpg/jpeg/png/webp.
    const imageMatches = html.matchAll(/<img[^>]*src="(https:\/\/cdn\.prod\.website-files\.com\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*class="[^"]*image-fit[^"]*"[^>]*>/g);
    let image = "";
    for (const im of imageMatches) {
      image = im[1];
      break;
    }
    // Also try reverse attribute order (class before src)
    if (!image) {
      const altMatch = html.match(/<img[^>]*class="[^"]*image-fit[^"]*"[^>]*src="(https:\/\/cdn\.prod\.website-files\.com\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/);
      if (altMatch) image = altMatch[1];
    }
    // Final fallback: any cdn product image (not SVG)
    if (!image) {
      const fallback = html.match(/src="(https:\/\/cdn\.prod\.website-files\.com\/6883fdbb5812fc399ce753da\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/);
      if (fallback) image = fallback[1];
    }

    // 4. Price: look for $XX.XX pattern where the value is > 0
    const priceMatches = html.matchAll(/\$([\d,]+\.\d{2})/g);
    let price = "";
    for (const pm of priceMatches) {
      const val = parseFloat(pm[1].replace(/,/g, ""));
      if (val > 0) {
        price = `$${pm[1]}`;
        break;
      }
    }

    return { name, description, image, price };
  } catch (err) {
    console.warn(`  Error fetching ${url}:`, err);
    return null;
  }
}

async function main() {
  // Deduplicate by URL
  const uniqueUrls = [...new Set(PRODUCT_MAP.map((p) => p.url))];
  const scraped: Record<string, Awaited<ReturnType<typeof scrapeProduct>>> = {};

  for (const url of uniqueUrls) {
    console.log(`Scraping: ${url}`);
    scraped[url] = await scrapeProduct(url);
    if (!scraped[url]) console.warn(`  FAILED: ${url}`);
    else console.log(`  OK: ${scraped[url]!.name}`);
  }

  // Build output: merge mapping + scraped data
  const seenSlugs = new Set<string>();
  const products: ScrapedProduct[] = [];

  for (const mapping of PRODUCT_MAP) {
    if (seenSlugs.has(mapping.slug)) continue;
    seenSlugs.add(mapping.slug);

    const data = scraped[mapping.url];
    products.push({
      sheetName: mapping.sheetName,
      slug: mapping.slug,
      url: mapping.url,
      badge: mapping.badge,
      name: data?.name || mapping.sheetName,
      description: data?.description || "",
      image: data?.image || "",
      price: data?.price || "",
    });
  }

  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), "..", "public", "products.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
  console.log(`\nWrote ${products.length} products to ${outPath}`);
}

main();
