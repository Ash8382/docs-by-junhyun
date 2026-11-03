import type { Case } from "@/data/projects/types";
import { renderInline } from "@/lib/inline";

type Block = { label: string; items: string[] };

export function CaseCard({ title, problem, solution, result }: Case) {
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
