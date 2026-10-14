import Link from "next/link";
import Image from "next/image";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { eutcha } from "@/data/projects/eutcha";
import { renderInline } from "@/lib/inline";

export default function EutchaPage() {
  const thumbnail = eutcha.screens[0];

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{eutcha.period}</span>
          <span>•</span>
          <span>{eutcha.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          {eutcha.title}
        </h1>
        <p className="text-xl text-muted-foreground">
          {renderInline(eutcha.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {eutcha.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          {eutcha.links.map((link) => (
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
          {eutcha.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>{eutcha.overviewCallout.title}</strong>
            <ul className="mt-2 mb-0 list-disc list-inside">
              {eutcha.overviewCallout.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <p>
            {renderInline(eutcha.roleIntro)}
          </p>
          <ul>
            {eutcha.role.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Tech Stack & Rules */}
        {eutcha.extraSections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          </section>
        ))}

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
