"use client";

import { useSearchParams, useRouter } from "next/navigation";
import type { PostCategory } from "@/data/posts";
import { categoryLabels, sortedPosts } from "@/data/posts";

function getCount(category?: PostCategory) {
  if (!category) return sortedPosts.length;
  return sortedPosts.filter((p) => p.category === category).length;
}

const categories: { key: PostCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "project", label: categoryLabels.project },
  { key: "post", label: categoryLabels.post },
];

export function BlogFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const current = searchParams.get("category") || "all";

  function handleFilter(key: string) {
    if (key === "all") {
      router.push("/blog");
    } else {
      router.push(`/blog?category=${key}`);
    }
  }

  return (
    <div className="flex gap-2">
      {categories.map(({ key, label }) => {
        const count = getCount(key === "all" ? undefined : key as PostCategory);
        return (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              current === key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs ${
              current === key ? "opacity-70" : "opacity-50"
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
