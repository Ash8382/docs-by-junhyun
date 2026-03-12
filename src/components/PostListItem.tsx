import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/data/posts";
import { categoryLabels } from "@/data/posts";

export function PostListItem({ slug, title, description, date, category, tags, image }: Post) {
  return (
    <article className="group py-5">
      <Link href={`/blog/${slug}`} className="flex gap-4 items-start">
        {image && (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="96px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
              {categoryLabels[category]}
            </span>
            <span>{date}</span>
          </div>
          <h3 className="text-lg font-semibold group-hover:text-muted-foreground transition-colors truncate">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="text-xs text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
