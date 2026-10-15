import Image from "next/image";
import Link from "next/link";
import { sortedPosts } from "@/data/posts";
import { projects } from "@/data/projects";
import type { Project, RepoId } from "@/data/projects/types";
import { renderInline } from "@/lib/inline";
import { DETAIL_SLUGS, journeyHash } from "@/lib/journey/hash";
import { STOPS, objectSide, type Stop } from "@/lib/journey/timeline";
import { EmailCopy } from "./EmailCopy";

const EMAIL = "one31798883@gmail.com";
/** 배경 은하 사진의 원본(NASA SVS Deep Star Maps 2020). 라이선스가 출처 표기를 요구한다 */
const GALAXY_CREDIT_URL = "https://svs.gsfc.nasa.gov/4851";
const GITHUB_URL = "https://github.com/Ash8382";

// 막 제목과 기간은 스펙 2절 "세 막" 표를 따른다. 설명 문장은 넣지 않는다(사용자 결정).
const ACTS = {
  1: { title: "1막 · 시작", period: "2023.04 ~ 2023.10" },
  2: { title: "2막 · 협업", period: "2023.09 ~ 2025.02" },
  3: { title: "3막 · 현재", period: "2025.09 ~" },
} as const;

// 움직이는 캔버스 위에서 backdrop-filter(흐림)는 매 프레임 GPU 재합성을 일으켜 스크롤을 끊는다. 반투명 단색만 쓴다.
const PANEL = "pointer-events-auto rounded-xl border border-white/10 bg-zinc-950/85 p-6 text-zinc-100 shadow-2xl";
const DETAIL_LINK =
  "mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-300 underline-offset-4 hover:underline";

function projectOf(stop: Stop): Project {
  const project = projects.find((item) => item.slug === stop.slug);
  if (!project) throw new Error(`정류장 ${stop.id}의 프로젝트가 없습니다`);
  return project;
}

/** 오브젝트 반대편에 글을 둔다. 좌우 규칙은 timeline.ts의 objectSide다. */
function panelSide(stop: Stop): string {
  return objectSide(stop) === -1 ? "ml-auto" : "mr-auto";
}

function actOf(stop: Stop): 1 | 2 | 3 {
  if (stop.act === 0) throw new Error(`막 정류장 ${stop.id}에 막 번호가 없습니다`);
  return stop.act;
}

function DetailLink({ slug, repo, label }: { slug: string; repo?: RepoId; label: string }) {
  // 링크가 10개라 화면에 보이지 않는 프로젝트 이름으로 구분한다. 화살표는 읽지 않는다.
  return (
    <a href={journeyHash({ slug, repo })} data-journey-detail className={DETAIL_LINK}>
      자세히 보기 <span aria-hidden>→</span>
      <span className="sr-only"> {label}</span>
    </a>
  );
}

function StackChips({ stack }: { stack: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {stack.map((tech) => (
        <li key={tech} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-200">
          {tech}
        </li>
      ))}
    </ul>
  );
}

function IntroStop() {
  return (
    <div className="container flex h-full items-center">
      <div className={`${PANEL} max-w-xl`}>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">A Journey Through Code</h1>
        <p aria-hidden className="mt-6 text-2xl text-zinc-400">
          ↓
        </p>
      </div>
    </div>
  );
}

function ActStop({ act }: { act: 1 | 2 | 3 }) {
  const info = ACTS[act];
  return (
    <div className="container flex h-full items-center justify-center">
      <div className={`${PANEL} text-center`}>
        <p className="font-mono text-xs tracking-[0.2em] text-zinc-400">{info.period}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{info.title}</h2>
      </div>
    </div>
  );
}

/** 1막: 지나가며 보는 캡션 */
function CaptionStop({ stop }: { stop: Stop }) {
  const project = projectOf(stop);
  return (
    <div className="container flex h-full items-center">
      <div className={`${PANEL} max-w-sm ${panelSide(stop)}`}>
        <p className="text-xs text-zinc-400">{project.period}</p>
        <h3 className="mt-1 text-xl font-semibold">{project.title}</h3>
        <p className="mt-2 text-sm text-zinc-300">{renderInline(project.summary)}</p>
        {DETAIL_SLUGS.includes(project.slug) && <DetailLink slug={project.slug} label={project.title} />}
      </div>
    </div>
  );
}

/** 2막: 멈춰서 보는 전시 구역. 섹션 높이 동안 패널이 화면에 머문다(sticky). */
function ExhibitStop({ stop }: { stop: Stop }) {
  const project = projectOf(stop);
  const thumbnail = project.screens[0];
  return (
    <div className="container sticky top-24 flex">
      <div className={`${PANEL} max-w-md ${panelSide(stop)}`}>
        <p className="text-xs text-zinc-400">
          {project.period} · {project.team}
        </p>
        <h3 className="mt-1 text-2xl font-semibold">{project.title}</h3>
        <p className="mt-2 text-zinc-300">{renderInline(project.summary)}</p>
        <StackChips stack={project.stack} />
        {thumbnail && (
          // 썸네일이 작은 글(Stock2U·Tix2U는 폭 약 720px)도 레티나에서 선명하도록 원본 폭의 절반까지만 키운다.
          <Image
            src={thumbnail.src}
            alt={thumbnail.alt}
            width={thumbnail.width}
            height={thumbnail.height}
            sizes="360px"
            className="mt-4 h-auto w-full rounded-lg border border-white/10"
            style={{ maxWidth: Math.min(360, thumbnail.width / 2) }}
          />
        )}
        <DetailLink slug={project.slug} label={project.title} />
      </div>
    </div>
  );
}

/** 3막: PiCKCARE 전시실. 위에 머무는 소개와, 화면 하나마다 하나씩 지나가는 저장소 5개 */
function HallStop({ stop }: { stop: Stop }) {
  const project = projectOf(stop);
  if (project.kind !== "repos") throw new Error("전시실은 저장소 구조 글이어야 합니다");
  return (
    <>
      <div className="container sticky top-20 z-10">
        <div className={`${PANEL} max-w-md py-4`}>
          <p className="text-xs text-zinc-400">
            {project.period} · {project.team}
          </p>
          <h3 className="mt-1 text-2xl font-semibold">{project.title}</h3>
          <p className="mt-2 text-sm text-zinc-300">{renderInline(project.summary)}</p>
        </div>
      </div>
      <div className="absolute inset-x-0 top-0">
        {project.repos.map((repo) => (
          <div
            key={repo.id}
            className="container flex items-end pb-[12svh]"
            style={{ height: `${(stop.length / project.repos.length) * 100}svh` }}
          >
            <div className={`${PANEL} ml-auto max-w-sm`}>
              <p className="font-mono text-sm text-amber-300">{repo.id}</p>
              <p className="mt-1 font-mono text-xs text-zinc-400">{repo.name}</p>
              <p className="mt-2 text-sm text-zinc-200">{renderInline(repo.tagline)}</p>
              <DetailLink slug={project.slug} repo={repo.id} label={repo.name} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** 엔딩. 넓은 화면에서는 패널을 오른쪽에 좁게 두어 왼쪽의 회랑 내려다보기(timeline.ts OVERVIEW_*)를 가리지 않는다 */
function EndingStop() {
  const recent = sortedPosts.filter((post) => post.category === "post").slice(0, 3);
  return (
    <div className="container flex h-full items-end pb-[10svh]">
      <div className={`${PANEL} w-full sm:ml-auto sm:max-w-md`}>
        <h2 className="text-3xl font-bold tracking-tight">연락처</h2>
        <div className="mt-6">
          <EmailCopy email={EMAIL} />
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
        >
          GitHub <span aria-hidden>↗</span>
        </a>
        <h2 className="mt-8 text-sm font-semibold text-zinc-400">최근 글</h2>
        <ul className="mt-3 space-y-2">
          {recent.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group flex items-baseline justify-between gap-4">
                <span className="group-hover:underline">{post.title}</span>
                <span className="shrink-0 text-xs text-zinc-400">{post.date}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs leading-relaxed text-zinc-400">
          배경 은하:{" "}
          <a href={GALAXY_CREDIT_URL} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            NASA/Goddard Space Flight Center Scientific Visualization Studio
          </a>
          , Gaia DR2: ESA/Gaia/DPAC
        </p>
      </div>
    </div>
  );
}

function StopBody({ stop }: { stop: Stop }) {
  switch (stop.kind) {
    case "intro":
      return <IntroStop />;
    case "act":
      return <ActStop act={actOf(stop)} />;
    case "project":
      return stop.pin ? <ExhibitStop stop={stop} /> : <CaptionStop stop={stop} />;
    case "hall":
      return <HallStop stop={stop} />;
    case "ending":
      return <EndingStop />;
  }
}

/**
 * 여정 본문. 3D가 없어도 그대로 읽히는 진짜 HTML이다.
 * 섹션은 클릭이 뒤의 캔버스로 가도록 pointer-events를 끄고, 패널만 켠다.
 */
export function JourneyContent() {
  return (
    <main data-journey-page className="pointer-events-none relative z-10">
      {STOPS.map((stop) => (
        <section
          key={stop.id}
          id={`stop-${stop.id}`}
          data-stop={stop.id}
          className="relative"
          style={{ height: `${stop.length * 100}svh` }}
        >
          <StopBody stop={stop} />
        </section>
      ))}
    </main>
  );
}
