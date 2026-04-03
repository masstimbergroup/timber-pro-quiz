"use client";

import { QuizResult, ProductInfo } from "@/lib/types";
import ProductCard from "./ProductCard";

interface ResultCardProps {
  result: QuizResult;
  products: Record<string, ProductInfo>;
  onRestart: () => void;
}

function findProduct(name: string, products: Record<string, ProductInfo>): ProductInfo | null {
  // If it's a URL, try matching by URL field in products
  if (name.startsWith("http://") || name.startsWith("https://")) {
    for (const val of Object.values(products)) {
      if (val.url === name) return val;
    }
    return null;
  }
  if (products[name]) return products[name];
  const altAnd = name.replace(/ & /g, " and ");
  if (products[altAnd]) return products[altAnd];
  const altAmp = name.replace(/ and /gi, " & ");
  if (products[altAmp]) return products[altAmp];
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(products)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

interface TreatmentStep {
  label: string;
  subtitle: string;
  productNames: string[];
}

export default function ResultCard({ result, products, onRestart }: ResultCardProps) {
  const steps: TreatmentStep[] = [];

  if (result.preTreatment) {
    steps.push({
      label: "Pre-treatment options",
      subtitle: "Recommended to use before coating or treatment",
      productNames: result.preTreatment.split(",").map((p) => p.trim()).filter((p) => p && !p.toLowerCase().includes("(skip)")),
    });
  }

  steps.push({
    label: "Main treatment solution",
    subtitle: "Recommended to use to accomplish desired goal and after pre-treatment",
    productNames: result.mainProducts.filter((p) => p.toLowerCase() !== "what you used prior" && !p.toLowerCase().includes("(skip)")),
  });

  if (result.postTreatment) {
    steps.push({
      label: "Post-treatment solution",
      subtitle: "Recommended to use for additional protection or enhancement",
      productNames: result.postTreatment.split(",").map((p) => p.trim()).filter((p) => p && !p.toLowerCase().includes("(skip)")),
    });
  }

  const activeSteps = steps.filter((s) => s.productNames.length > 0);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <p
        className="text-center text-lg italic mb-1"
        style={{ color: "var(--color-btn-yes)" }}
      >
        Your results
      </p>
      <h2 className="text-3xl font-bold mb-12 text-center" style={{ color: "var(--color-text)" }}>
        Recommended products
      </h2>

      {result.isAdvisory && (
        <div
          className="p-5 rounded-lg mb-6 text-center border"
          style={{ borderColor: "var(--color-btn-yes)", background: "var(--color-bg-card)" }}
        >
          <p className="text-lg font-medium" style={{ color: "var(--color-text)" }}>
            We recommend re-applying the stain you previously used on this project.
          </p>
          {activeSteps.length > 0 && (
            <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
              Here are additional recommended products:
            </p>
          )}
        </div>
      )}

      <div className="space-y-12">
        {activeSteps.map((step, i) => (
          <div key={step.label}>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0"
                style={{ background: "var(--color-number-bg)", color: "var(--color-text-light)" }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                  {step.label}
                </h3>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {step.subtitle}
                </p>
              </div>
            </div>
            <div className="ml-10 space-y-3">
              {step.productNames.map((name) => (
                <ProductCard
                  key={name}
                  productName={name}
                  product={findProduct(name, products)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={onRestart}
          className="px-8 py-3 rounded-lg font-semibold transition-all duration-200 cursor-pointer"
          style={{ background: "var(--color-btn-yes)", color: "var(--color-text-light)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-btn-yes-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-btn-yes)")}
        >
          Find a different product
        </button>
      </div>
    </div>
  );
}
