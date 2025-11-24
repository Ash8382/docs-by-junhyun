import Link from "next/link";
import Image from "next/image";

interface PostCardProps {
  slug: string;
  title: string;
  description: string;
  date: string;
  image?: string;
}

export function PostCard({ slug, title, description, date, image }: PostCardProps) {
  return (
    <article className="group relative flex flex-col space-y-2 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      {image && (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <Link href={`/blog/${slug}`} className="absolute inset-0 z-10">
        <span className="sr-only">View Article</span>
      </Link>
      <div className="flex flex-col space-y-1 p-4">
        <h2 className="text-xl font-bold tracking-tight line-clamp-1">{title}</h2>
        <p className="text-muted-foreground line-clamp-2 text-sm">{description}</p>
        <p className="text-xs text-muted-foreground pt-2">{date}</p>
      </div>
    </article>
  );
}
