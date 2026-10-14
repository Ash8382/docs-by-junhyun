import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { pfplay } from "@/data/projects/pfplay";
import { renderInline } from "@/lib/inline";

// 이 글은 prose를 쓰지 않아 굵은 글씨마다 색을 직접 붙인다.
const STRONG = "text-zinc-900 dark:text-zinc-100";

export default function PFPlayPage() {
  const thumbnail = pfplay.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{pfplay.period}</span>
          <span>•</span>
          <span>{pfplay.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {pfplay.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(pfplay.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {pfplay.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {pfplay.links.map((link) => (
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
      <div className="max-w-none space-y-12">

        {/* Overview */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-zinc-950 dark:text-zinc-50">프로젝트 개요</h2>
          {pfplay.overview.map((paragraph) => (
            <p key={paragraph} className="text-zinc-800 dark:text-zinc-200 mb-4">
              {renderInline(paragraph, { strongClassName: STRONG })}
            </p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong className={STRONG}>{pfplay.overviewCallout.title}</strong>
            <ul className="mt-2 mb-0 list-disc list-inside text-zinc-800 dark:text-zinc-200">
              {pfplay.overviewCallout.items.map((item) => (
                <li key={item}>{renderInline(item, { strongClassName: STRONG })}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-zinc-950 dark:text-zinc-50">담당 역할</h2>
          <ul className="space-y-3 list-disc list-inside text-zinc-800 dark:text-zinc-200">
            {pfplay.role.map((item) => (
              <li key={item}>{renderInline(item, { strongClassName: STRONG })}</li>
            ))}
          </ul>
        </section>

        {/* Achievements */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-zinc-950 dark:text-zinc-50">성과 및 배운 점</h2>
          <ul className="space-y-3 list-disc list-inside text-zinc-800 dark:text-zinc-200">
            {pfplay.achievements.map((item) => (
              <li key={item}>{renderInline(item, { strongClassName: STRONG })}</li>
            ))}
          </ul>
        </section>

        {/* Background Note */}
        <section>
          <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-r-lg">
            <h3 className="text-yellow-800 dark:text-yellow-200 mt-0 mb-2 text-lg font-semibold">{pfplay.note.title}</h3>
            <p className="text-yellow-700 dark:text-yellow-300 m-0 text-sm">
              {renderInline(pfplay.note.text, { strongClassName: STRONG })}
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
