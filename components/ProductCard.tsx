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

  if (isDirectUrl && !resolved) {
    if (loading) {
      return (
        <div
          className="p-5 rounded-lg animate-pulse"
          style={{ background: "var(--color-bg-product)" }}
        >
          <div className="h-5 w-48 rounded" style={{ background: "rgba(0,0,0,0.1)" }} />
        </div>
      );
    }
    return (
      <a
        href={productName}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden transition-transform duration-200 ease-out hover:scale-[1.01]"
        style={{ background: "var(--color-bg-product)", textDecoration: "none" }}
      >
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: "var(--color-bg-product-footer)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--color-badge-olive)" }}>View product</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-badge-olive)" }}>
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </div>
      </a>
    );
  }

  if (!resolved || !resolved.url) {
    return (
      <div className="p-5 rounded-lg" style={{ background: "var(--color-bg-product)" }}>
        <h4 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
          {productName}
        </h4>
      </div>
    );
  }

  return (
    <a
      href={resolved.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden transition-transform duration-200 ease-out hover:scale-[1.01]"
      style={{ background: "var(--color-bg-product)", textDecoration: "none", border: "2px solid var(--color-stroke)" }}
    >
      <div className="flex">
        {/* Image column: spans full card height */}
        {resolved.image && (
          <div
            className="flex-shrink-0 w-[38%] flex items-center justify-center p-5"
            style={{ background: "var(--color-bg-product-image)" }}
          >
            <img
              src={resolved.image}
              alt={resolved.name}
              className="w-full h-auto object-contain"
            />
          </div>
        )}
        {/* Right column: text content + footer */}
        <div className="flex-1 min-w-0 flex flex-col" style={{ borderLeft: "2px solid var(--color-stroke)" }}>
          <div className="flex-1 p-6">
            {resolved.badge && (
              <span
                className="inline-block font-medium mb-4"
                style={{ background: "var(--color-badge-olive)", color: "#FFFFFF", borderRadius: "0", padding: "10px 20px", fontSize: "12px", lineHeight: "150%", fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                {resolved.badge}
              </span>
            )}
            <h4 className="mb-3" style={{ color: "var(--color-text)", fontSize: "24px", fontWeight: 500, lineHeight: "100%", letterSpacing: "-0.04em" }}>
              {resolved.name}
            </h4>
            {resolved.description && (
              <p className="line-clamp-3" style={{ color: "var(--color-text-muted)", fontSize: "12px", fontWeight: 400, lineHeight: "150%", letterSpacing: "0", fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
                {resolved.description}
              </p>
            )}
          </div>
          {/* Footer: only spans the right column */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: "var(--color-bg-product-footer)", borderTop: "2px solid var(--color-stroke)" }}
          >
            <span style={{ color: "var(--color-badge-olive)", fontSize: "20px", fontWeight: 500, lineHeight: "100%", letterSpacing: "-0.04em" }}>View product</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-badge-olive)" }}>
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}
