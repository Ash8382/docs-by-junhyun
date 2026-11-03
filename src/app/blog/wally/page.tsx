import Link from "next/link";
import Image from "next/image";
import { CaseCard } from "@/components/CaseCard";
import { wally } from "@/data/projects/wally";
import { renderInline } from "@/lib/inline";

export const metadata = {
  title: "WALLY - 이준현",
  description: wally.summary,
};

export default function WallyPage() {
  const [thumbnail, ...appScreens] = wally.screens;

  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{wally.period}</span>
          <span>•</span>
          <span>{wally.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {wally.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(wally.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {wally.stack.map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
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
          {wally.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>{wally.overviewCallout.title}</strong>
            <ul className="mt-2 mb-0 list-disc list-inside">
              {wally.overviewCallout.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Screens */}
        <section>
          <h2>화면</h2>
          <div className="not-prose grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {appScreens.map((screen) => (
              <Image
                key={screen.src}
                src={screen.src}
                alt={screen.alt}
                width={screen.width}
                height={screen.height}
                className="w-full h-auto rounded-2xl border border-border"
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            화면 디자인은 WALLY 디자인팀의 작업입니다. 목 데이터로 찍은 iOS 화면입니다.
          </p>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <p>{renderInline(wally.roleIntro)}</p>
          <ul>
            {wally.role.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Cases */}
        <section className="space-y-4">
          <h2>주요 작업</h2>
          {wally.cases.map((item) => (
            <CaseCard key={item.title} {...item} />
          ))}
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            {wally.achievements.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30 p-4 rounded-r-lg">
            <h3 className="text-orange-800 dark:text-orange-200 mt-0 mb-2 text-lg font-semibold">{wally.note.title}</h3>
            <p className="text-orange-700 dark:text-orange-300 m-0 text-sm">
              {renderInline(wally.note.text)}
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
