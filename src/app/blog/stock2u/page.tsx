import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { stock2u } from "@/data/projects/stock2u";
import { renderInline } from "@/lib/inline";

export default function Stock2UPage() {
  const thumbnail = stock2u.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{stock2u.period}</span>
          <span>•</span>
          <span>{stock2u.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {stock2u.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(stock2u.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {stock2u.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {stock2u.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={
                link.kind === "github"
                  ? "flex items-center gap-2 text-sm font-medium hover:underline text-zinc-700 dark:text-zinc-300"
                  : "flex items-center gap-2 text-sm font-medium hover:underline"
              }
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src={thumbnail.src}
          alt={thumbnail.alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Content */}
      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12 prose-headings:text-zinc-950 dark:prose-headings:text-zinc-50 prose-p:text-zinc-800 dark:prose-p:text-zinc-200 prose-li:text-zinc-800 dark:prose-li:text-zinc-200 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">

        {/* Overview */}
        <section>
          <h2>프로젝트 개요</h2>
          {stock2u.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>{stock2u.overviewCallout.title}</strong>
            <ul className="mt-2 mb-0 list-disc list-inside">
              {stock2u.overviewCallout.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <ul>
            {stock2u.role.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            {stock2u.achievements.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-r-lg">
            <h3 className="text-red-800 dark:text-red-200 mt-0 mb-2 text-lg font-semibold">{stock2u.note.title}</h3>
            <p className="text-red-700 dark:text-red-300 m-0 text-sm">
              {renderInline(stock2u.note.text)}
            </p>
          </div>
        </section>

      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
