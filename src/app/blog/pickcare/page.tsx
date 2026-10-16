import Link from "next/link";
import { pickcare } from "@/data/projects/pickcare";
import { renderInline } from "@/lib/inline";

export const metadata = {
  title: "PiCKCARE - 이준현",
  description:
    "반려동물 스타트업 픽케어에서 프론트엔드를 단독으로 맡아 메인 서비스·B2B CRM·스튜디오·네이티브 앱·사내 자동화 도구까지 다섯 개 저장소를 구축한 기록.",
};

type Block = { label: string; items: string[] };

function Case({
  title,
  problem,
  solution,
  result,
}: {
  title: string;
  problem: string[];
  solution: string[];
  result: string[];
}) {
  const blocks: Block[] = [
    { label: "PROBLEM", items: problem },
    { label: "SOLUTION", items: solution },
    { label: "RESULT", items: result },
  ];
  return (
    <div className="not-prose rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-muted/40">
        <h4 className="font-semibold text-[15px] leading-snug text-zinc-900 dark:text-zinc-100">{title}</h4>
      </div>
      <div className="p-5 space-y-5">
        {blocks.map((block) => (
          <div key={block.label}>
            <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground mb-2.5">
              ## {block.label}
            </p>
            <ul className="space-y-1.5">
              {block.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                  <span
                    aria-hidden
                    className={
                      block.label === "RESULT"
                        ? "font-mono text-emerald-600 dark:text-emerald-400 shrink-0"
                        : "font-mono text-muted-foreground shrink-0"
                    }
                  >
                    {block.label === "RESULT" ? "+" : "-"}
                  </span>
                  <span
                    className={
                      block.label === "RESULT"
                        ? "text-emerald-800 dark:text-emerald-200"
                        : "text-zinc-800 dark:text-zinc-200"
                    }
                  >
                    {renderInline(item)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Repo({
  name,
  tagline,
  stack,
  children,
}: {
  name: string;
  tagline: string;
  stack: string[];
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="!mb-0 font-mono">{name}</h2>
        <p className="!mt-2">{renderInline(tagline)}</p>
      </div>

      <div className="not-prose flex flex-wrap gap-1.5">
        {stack.map((tech) => (
          <span
            key={tech}
            className="px-2 py-0.5 rounded border border-border text-xs font-mono text-muted-foreground"
          >
            {tech}
          </span>
        ))}
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function PickcarePage() {
  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{pickcare.period}</span>
          <span>&middot;</span>
          <span>{pickcare.team}</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          {pickcare.title}
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          {renderInline(pickcare.summary)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {pickcare.stack.map((tech) => (
            <span
              key={tech}
              className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-14 prose-headings:text-zinc-950 dark:prose-headings:text-zinc-50 prose-p:text-zinc-800 dark:prose-p:text-zinc-200 prose-li:text-zinc-800 dark:prose-li:text-zinc-200 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100">
        {pickcare.repos.map((repo) => (
          <Repo key={repo.name} name={repo.name} tagline={repo.tagline} stack={repo.stack}>
            {repo.cases.map((item) => (
              <Case
                key={item.title}
                title={item.title}
                problem={item.problem}
                solution={item.solution}
                result={item.result}
              />
            ))}
          </Repo>
        ))}

        {/* 마무리 */}
        <section>
          <h2>돌아보면</h2>
          {pickcare.closing.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
        </section>
      </div>

      <hr className="my-12 border-border" />

      <div className="flex justify-center">
        <Link
          href="/blog"
          className="flex items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          목록으로 돌아가기
        </Link>
      </div>
    </article>
  );
}
