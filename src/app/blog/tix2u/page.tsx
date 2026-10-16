import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { tix2u } from "@/data/projects/tix2u";
import { renderInline } from "@/lib/inline";

export default function Tix2UPage() {
  const thumbnail = tix2u.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{tix2u.period}</span>
          <span>•</span>
          <span>{tix2u.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {tix2u.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(tix2u.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {tix2u.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {tix2u.links.map((link) => (
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
          {tix2u.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>{tix2u.overviewCallout.title}</strong>
            <p className="mt-2 mb-0">
              {renderInline(tix2u.overviewCallout.text)}
            </p>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {tix2u.role.map((group) => (
              <div key={group.title}>
                <h3 className="text-lg font-semibold mt-0">{group.title}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{renderInline(item)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            {tix2u.achievements.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30 p-4 rounded-r-lg">
            <h3 className="text-orange-800 dark:text-orange-200 mt-0 mb-2 text-lg font-semibold">{tix2u.note.title}</h3>
            <p className="text-orange-700 dark:text-orange-300 m-0 text-sm">
              {renderInline(tix2u.note.text)}
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
