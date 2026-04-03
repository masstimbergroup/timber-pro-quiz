"use client";

import { useState, useEffect } from "react";
import { ProductInfo } from "@/lib/types";

interface ProductCardProps {
  product: ProductInfo | null;
  productName: string;
}

function isUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

export default function ProductCard({ product, productName }: ProductCardProps) {
  const [fetched, setFetched] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const isDirectUrl = isUrl(productName);

  useEffect(() => {
    if (!isDirectUrl || product) return;

    setLoading(true);
    fetch(`/api/product-meta?url=${encodeURIComponent(productName)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.name) {
          setFetched({
            name: data.name,
            slug: "",
            url: productName,
            image: data.image || "",
            description: data.description || "",
            badge: "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDirectUrl, product, productName]);

  const resolved = product || fetched;

  // URL-based product with no cached data yet
  if (isDirectUrl && !resolved) {
    if (loading) {
      return (
        <div
          className="p-5 rounded-lg border animate-pulse"
          style={{ background: "var(--color-bg-product)", borderColor: "var(--color-card-border)" }}
        >
          <div className="h-5 w-48 rounded" style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>
      );
    }
    // Fallback: just show as a link
    return (
      <a
        href={productName}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-5 rounded-lg border transition-transform duration-200 ease-out hover:scale-[1.02]"
        style={{
          background: "var(--color-bg-product)",
          borderColor: "var(--color-card-border)",
          textDecoration: "none",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: "var(--color-text-light)" }}>
            View product
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-light)" }}>
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </div>
      </a>
    );
  }

  // Name-based product with no match in products.json
  if (!resolved || !resolved.url) {
    return (
      <div
        className="p-5 rounded-lg border"
        style={{ background: "var(--color-bg-product)", borderColor: "var(--color-card-border)" }}
      >
        <h4 className="text-lg font-bold" style={{ color: "var(--color-text-light)" }}>
          {productName}
        </h4>
      </div>
    );
  }

  // Full product card
  return (
    <a
      href={resolved.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden border transition-transform duration-200 ease-out hover:scale-[1.02]"
      style={{
        background: "var(--color-bg-product)",
        borderColor: "var(--color-card-border)",
        textDecoration: "none",
      }}
    >
      <div className="flex">
        {resolved.image && (
          <div className="flex-shrink-0 w-[33%]">
            <img src={resolved.image} alt={resolved.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0 p-5">
          {resolved.badge && (
            <span
              className="inline-block px-3 py-1 text-xs font-medium mb-3"
              style={{
                background: "var(--color-badge-olive)",
                color: "var(--color-text-light)",
                borderRadius: "4px",
              }}
            >
              {resolved.badge}
            </span>
          )}
          <h4 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-light)" }}>
            {resolved.name}
          </h4>
          {resolved.description && (
            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.85)" }}>
              {resolved.description}
            </p>
          )}
        </div>
      </div>
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--color-card-border)" }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--color-text-light)" }}>
          View product
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-light)" }}>
          <path d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
      </div>
    </a>
  );
}
