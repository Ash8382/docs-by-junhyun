"use client";

import { useSearchParams } from "next/navigation";
import { sortedPosts } from "@/data/posts";
import { PostListItem } from "@/components/PostListItem";
import type { PostCategory } from "@/data/posts";

export function BlogPostList() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") as PostCategory | null;

  const filtered = category
    ? sortedPosts.filter((post) => post.category === category)
    : sortedPosts;

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        아직 글이 없습니다.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {filtered.map((post) => (
        <PostListItem key={post.slug} {...post} />
      ))}
    </div>
  );
}
