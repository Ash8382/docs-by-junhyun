"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { ProjectLinkIcon } from "@/components/ProjectLinkIcon";
import { projects } from "@/data/projects";
import {
  isItemGroups,
  type Inline,
  type ItemGroup,
  type Project,
  type RepoId,
  type ReposProject,
  type Screen,
  type StandardProject,
} from "@/data/projects/types";
import { renderInline } from "@/lib/inline";
import { lockScroll, unlockScroll } from "@/lib/journey/engine";
import { activeRepo, journeyHash, parseJourneyHash } from "@/lib/journey/hash";
import { getHash, getServerHash, pushHash, replaceHash, subscribeHash } from "@/lib/journey/hashStore";
import { STOPS } from "@/lib/journey/timeline";

const TITLE_ID = "journey-dialog-title";
const CASE_PARTS = [
  ["problem", "PROBLEM"],
  ["solution", "SOLUTION"],
  ["result", "RESULT"],
] as const;

/** 1막 프로젝트는 화면과 개요만 보여주는 가벼운 상세다(스펙 2절). */
function isLight(slug: string): boolean {
  return STOPS.some((stop) => stop.slug === slug && stop.act === 1);
}

/**
 * 상세 패널. URL 해시(#pfplay, #pickcare/biz)가 단일 원천이다.
 * - "자세히 보기"는 기록을 하나 남기고 연다 → 뒤로 가기로 닫힌다
 * - 공유 주소로 들어와 열린 패널은 기록 없이 닫는다 → 사이트를 떠나지 않는다
 * - 열린 동안 페이지 스크롤을 멈추고 패널 안에서만 스크롤한다
 */
export function ProjectDialog() {
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const target = parseJourneyHash(hash);
  const slug = target?.slug ?? null;
  const project = slug ? (projects.find((item) => item.slug === slug) ?? null) : null;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pushedByUs = useRef(false);
  const pressedBackdrop = useRef(false);

  // "자세히 보기" 클릭을 가로채 기록을 하나 남기고 연다.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[data-journey-detail]") : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      event.preventDefault();
      returnFocus.current = link;
      pushedByUs.current = true;
      pushHash(link.hash);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // 공유 주소(/journey#pfplay)로 들어오면 해당 정류장으로 먼저 옮긴다. 하이드레이션 때 2D 배치로 바뀌는 기기가 있어(JourneyStage의
  // 2D 표지는 이 패널보다 늦게 걸린다) 한 프레임 뒤에 옮긴다(2-4b).
  useEffect(() => {
    const initial = parseJourneyHash(window.location.hash);
    if (!initial) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`stop-${initial.slug}`)?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  // slug가 있으면 잠그고 연다. 닫기·잠금 해제·포커스 복귀는 정리 함수가 맡아 언마운트(블로그 원문으로 이동)에서도 잠금이 남지 않는다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!slug || !dialog) return;
    lockScroll();
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      unlockScroll();
      pushedByUs.current = false;
      returnFocus.current?.focus({ preventScroll: true });
      returnFocus.current = null;
    };
  }, [slug]);

  function requestClose() {
    // 기록은 한 번만 되돌린다. 뒤로 가기가 끝나기 전에 또 닫으면 replaceHash로 떨어져 사이트를 떠나지 않는다.
    if (pushedByUs.current) {
      pushedByUs.current = false;
      window.history.back();
    } else {
      replaceHash("");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // 패널 바깥(배경막)에서 누르고 뗀 클릭만 닫는다. 안쪽 내용은 패널을 가득 채워 여기에 닿지 않는다.
        // 패널 안에서 시작한 글자 선택, 링크 더블클릭의 두 번째 클릭(detail 2)은 닫지 않는다.
        const fromBackdrop = pressedBackdrop.current && event.target === event.currentTarget;
        pressedBackdrop.current = false;
        if (fromBackdrop && event.detail === 1) requestClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-xl border-0 border-l border-white/10 bg-zinc-950 p-0 text-zinc-100 backdrop:bg-black/60 max-sm:motion-safe:animate-[journey-sheet_0.25s_ease-out]"
    >
      {project && (
        <div data-lenis-prevent className="h-full overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-10 flex justify-end bg-zinc-950/95 px-4 py-3">
            <button
              type="button"
              onClick={requestClose}
              aria-label="닫기"
              className="rounded-md px-2 py-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="px-6 pb-12 sm:px-8">
            <DetailHeader project={project} />
            {project.kind === "repos" ? (
              <ReposDetail project={project} repoId={target?.repo} />
            ) : (
              <StandardDetail project={project} light={isLight(project.slug)} />
            )}
            <Link
              href={`/blog/${project.slug}`}
              className="mt-10 inline-flex text-sm font-medium text-sky-300 underline-offset-4 hover:underline"
            >
              블로그 원문 보기 <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      )}
    </dialog>
  );
}

function DetailHeader({ project }: { project: Project }) {
  return (
    <header>
      <p className="text-xs text-zinc-400">
        {project.period} · {project.team}
      </p>
      <h2 id={TITLE_ID} className="mt-1 text-3xl font-bold tracking-tight">
        {project.title}
      </h2>
      <p className="mt-3 text-zinc-300">{renderInline(project.summary)}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {project.stack.map((tech) => (
          <li key={tech} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
            {tech}
          </li>
        ))}
      </ul>
      {project.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4">
          {project.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
            >
              <ProjectLinkIcon kind={link.kind} />
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

/**
 * 원본 폭의 절반까지만 키워 레티나에서도 선명하게 보인다(썸네일이 작은 Stock2U·Tix2U 포함).
 * 세로로 긴 휴대폰 화면(PiCKCARE app)은 한 줄에 나란히 둔다. 위아래로 쌓으면 패널 몇 화면을 차지한다.
 */
function Screens({ screens }: { screens: Screen[] }) {
  if (screens.length === 0) return null;
  const phone = screens.every((screen) => screen.height > screen.width);
  return (
    <section className={phone ? "mt-6 grid grid-cols-3 gap-3" : "mt-6 space-y-3"} aria-label="제품 화면">
      {screens.map((screen) => (
        <Image
          key={screen.src}
          src={screen.src}
          alt={screen.alt}
          width={screen.width}
          height={screen.height}
          sizes={phone ? "(min-width: 640px) 170px, 33vw" : "(min-width: 640px) 512px, 100vw"}
          className="h-auto w-full rounded-lg border border-white/10"
          style={phone ? undefined : { maxWidth: screen.width / 2 }}
        />
      ))}
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{title}</h3>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-zinc-200">{children}</div>
    </section>
  );
}

function ItemList({ items }: { items: Inline[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{renderInline(item)}</li>
      ))}
    </ul>
  );
}

function RoleList({ role }: { role: Inline[] | ItemGroup[] }) {
  if (!isItemGroups(role)) return <ItemList items={role} />;
  return (
    <div className="space-y-4">
      {role.map((group) => (
        <div key={group.title}>
          <p className="font-medium">{group.title}</p>
          <ItemList items={group.items} />
        </div>
      ))}
    </div>
  );
}

function StandardDetail({ project, light }: { project: StandardProject; light: boolean }) {
  return (
    <>
      <Screens screens={project.screens} />
      {light ? (
        <Section title="개요">
          {project.overview.map((paragraph) => (
            <p key={paragraph}>{renderInline(paragraph)}</p>
          ))}
        </Section>
      ) : (
        <>
          {project.role && (
            <Section title="담당 역할">
              {project.roleIntro && <p>{renderInline(project.roleIntro)}</p>}
              <RoleList role={project.role} />
            </Section>
          )}
          {project.achievements && (
            <Section title="성과 및 배운 점">
              <ItemList items={project.achievements} />
            </Section>
          )}
        </>
      )}
    </>
  );
}

function ReposDetail({ project, repoId }: { project: ReposProject; repoId?: RepoId }) {
  const active = activeRepo(project, repoId);
  return (
    <>
      <div role="tablist" aria-label="저장소" className="mt-6 flex flex-wrap gap-1 border-b border-white/10">
        {project.repos.map((repo) => {
          const selected = repo.id === active.id;
          return (
            <button
              key={repo.id}
              type="button"
              role="tab"
              id={`journey-tab-${repo.id}`}
              aria-selected={selected}
              aria-controls="journey-tabpanel"
              onClick={() => replaceHash(journeyHash({ slug: project.slug, repo: repo.id }))}
              className={`-mb-px border-b-2 px-3 py-2 font-mono text-xs transition-colors ${
                selected ? "border-amber-300 text-white" : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {repo.id}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="journey-tabpanel" aria-labelledby={`journey-tab-${active.id}`} key={active.id} className="mt-4">
        <p className="font-mono text-sm text-zinc-400">{active.name}</p>
        <p className="mt-1 text-zinc-200">{renderInline(active.tagline)}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {active.stack.map((tech) => (
            <li key={tech} className="rounded border border-white/10 px-2 py-0.5 font-mono text-xs text-zinc-400">
              {tech}
            </li>
          ))}
        </ul>
        <Screens screens={active.screens} />
        <div className="mt-6 space-y-3">
          {active.cases.map((item, index) => (
            <details key={item.title} open={index === 0} className="rounded-lg border border-white/10 bg-white/5">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">{item.title}</summary>
              <div className="space-y-4 px-4 pb-4 text-sm leading-relaxed">
                {CASE_PARTS.map(([key, label]) => (
                  <div key={key}>
                    <p className="font-mono text-[11px] tracking-[0.12em] text-zinc-500">## {label}</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {item[key].map((line) => (
                        <li key={line} className={key === "result" ? "text-emerald-300" : "text-zinc-200"}>
                          {renderInline(line)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
