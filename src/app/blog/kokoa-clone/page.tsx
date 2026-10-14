import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { kokoaClone } from "@/data/projects/kokoa-clone";
import { renderInline } from "@/lib/inline";

export default function KokoaClonePage() {
  const thumbnail = kokoaClone.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{kokoaClone.period}</span>
          <span>•</span>
          <span>{kokoaClone.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          {kokoaClone.title}
        </h1>
        <p className="text-xl text-muted-foreground">
          {renderInline(kokoaClone.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {kokoaClone.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {kokoaClone.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:underline"
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
      <div className="prose dark:prose-invert max-w-none space-y-12">

        {/* Overview */}
        <section>
          <h2>프로젝트 개요</h2>
          {kokoaClone.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            {kokoaClone.achievements.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-r-lg">
            <h3 className="text-red-800 dark:text-red-200 mt-0 mb-2 text-lg font-semibold">{kokoaClone.note.title}</h3>
            <p className="text-red-700 dark:text-red-300 m-0 text-sm">
              {renderInline(kokoaClone.note.text)}
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
