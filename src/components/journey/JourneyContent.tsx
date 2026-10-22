import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { sortedPosts } from "@/data/posts";
import { projects } from "@/data/projects";
import type { Project, RepoId } from "@/data/projects/types";
import { renderInline } from "@/lib/inline";
import { CAR_CREDIT } from "@/lib/journey/carAsset";
import { DETAIL_SLUGS, journeyHash } from "@/lib/journey/hash";
import { HALL_REPO_END, HALL_REPO_START, STOPS, objectSide, type Stop } from "@/lib/journey/timeline";
import { TRAIL_HEX } from "@/lib/journey/trail";
import { EmailCopy } from "./EmailCopy";
import { HologramThumbnail } from "./HologramThumbnail";

const EMAIL = "one31798883@gmail.com";
/** 배경 은하 사진의 원본(NASA SVS Deep Star Maps 2020). 라이선스가 출처 표기를 요구한다 */
const GALAXY_CREDIT_URL = "https://svs.gsfc.nasa.gov/4851";
const GITHUB_URL = "https://github.com/Ash8382";

// 막 기간은 스펙 2절 "세 막" 표를 따른다. 막 이름("1막 · 시작")과 설명 문장은 보이지 않는다(사용자 결정, 병합 뒤)
const ACT_PERIODS = {
  1: "2023.04 ~ 2023.10",
  2: "2023.09 ~ 2025.02",
  3: "2025.09 ~",
} as const;

// 움직이는 캔버스 위에서 backdrop-filter(흐림)는 매 프레임 GPU 재합성을 일으켜 스크롤을 끊는다. 반투명 단색만 쓴다.
const PANEL = "pointer-events-auto rounded-xl border border-white/10 bg-zinc-950/85 p-6 text-zinc-100 shadow-2xl";

/** 2D 왼쪽 선의 막 색(빛의 길과 같은 색, 스펙 5절 "2D 레이아웃"). 엔딩은 마지막 막 색으로 끝난다 */
const ACT_LINE: Record<1 | 2 | 3, string> = { 1: TRAIL_HEX.start, 2: TRAIL_HEX.middle, 3: TRAIL_HEX.end };
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

/**
 * 입구. 세로 화면에서는 서버가 그린 자리를 아래 고정 자리(화면 아래 5svh)와 맞춰 첫 로딩 때 옮겨지지 않게 한다(2-4b). 서버가 그린 배치에서
 * 본문은 헤더(3.5rem) 아래에서 시작하므로 그만큼 더 띄운다(고정 자리에서는 globals.css가 아래 여백을 5svh로 덮는다)
 */
function IntroStop() {
  return (
    <div data-journey-card="intro" className="container flex h-full items-end justify-center pb-[calc(2.5rem+3.5rem)] portrait:pb-[calc(5svh+3.5rem)]">
      {/* 보이는 제목은 두지 않는다(사용자 결정, 병합 뒤). 화면 낭독기가 제목으로 찾아올 수 있게 이름만 둔다(헤더 메뉴와 같은 글자).
          남는 스크롤 안내(↓)는 첫 화면 아래 가운데에 패널과 같은 색의 작은 원으로 둔다(도로 중앙선 위에서도 보이게). 2D에서는 감춘다 */}
      <h1 className="sr-only">Journey</h1>
      <p
        aria-hidden
        data-journey-hint
        className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-zinc-950/85 text-lg text-zinc-300"
      >
        ↓
      </p>
    </div>
  );
}

/** 막이 시작하는 자리: 그 막의 기간만 보인다. 본문 제목 구조(h1 → 막 → 프로젝트)를 지키려고 기간을 h2로 둔다 */
function ActStop({ act }: { act: 1 | 2 | 3 }) {
  return (
    <div data-journey-card={`act-${act}`} className="container flex h-full items-center justify-center">
      <div className={`${PANEL} text-center`}>
        <h2 className="font-mono text-xl font-medium tracking-[0.15em] sm:text-2xl">{ACT_PERIODS[act]}</h2>
      </div>
    </div>
  );
}

/** 1막: 지나가며 보는 캡션 */
function CaptionStop({ stop }: { stop: Stop }) {
  const project = projectOf(stop);
  return (
    <div data-journey-card={stop.id} className="container flex h-full items-center">
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
    <div data-journey-card={stop.id} className="container sticky top-24 flex">
      <div className={`${PANEL} max-w-md ${panelSide(stop)}`}>
        <p className="text-xs text-zinc-400">
          {project.period} · {project.team}
        </p>
        <h3 className="mt-1 text-2xl font-semibold">{project.title}</h3>
        <p className="mt-2 text-zinc-300">{renderInline(project.summary)}</p>
        <StackChips stack={project.stack} />
        {thumbnail && (
          // 썸네일이 작은 글(Stock2U·Tix2U는 폭 약 720px)도 레티나에서 선명하도록 원본 폭의 절반까지만 키운다.
          // 같은 프로젝트의 홀로그램이 3D에 켜져 있으면 화면에서만 감춘다.
          <HologramThumbnail id={project.slug}>
            <Image
              src={thumbnail.src}
              alt={thumbnail.alt}
              width={thumbnail.width}
              height={thumbnail.height}
              sizes="360px"
              className="mt-4 h-auto w-full rounded-lg border border-white/10"
              style={{ maxWidth: Math.min(360, thumbnail.width / 2) }}
            />
          </HologramThumbnail>
        )}
        <DetailLink slug={project.slug} label={project.title} />
      </div>
    </div>
  );
}

/**
 * 3막: PiCKCARE 전시실. 위에 머무는 소개와, 하나씩 지나가는 저장소 5개. 저장소 블록은 구역 위에서 HALL_REPO_START화면 뒤부터
 * 아래에서 HALL_REPO_END화면 앞까지 고르게 나눈다(차가 들어오고 떠나는 동안은 홀로그램 줄이 밀려나므로). 앞줄 판정과 같은 구간이다.
 */
function HallStop({ stop }: { stop: Stop }) {
  const project = projectOf(stop);
  if (project.kind !== "repos") throw new Error("전시실은 저장소 구조 글이어야 합니다");
  return (
    <>
      <div data-journey-card={stop.id} className="container sticky top-20 z-10">
        <div className={`${PANEL} max-w-md py-4`}>
          <p className="text-xs text-zinc-400">
            {project.period} · {project.team}
          </p>
          <h3 className="mt-1 text-2xl font-semibold">{project.title}</h3>
          <p className="mt-2 text-sm text-zinc-300">{renderInline(project.summary)}</p>
        </div>
      </div>
      <div className="absolute inset-x-0" style={{ top: `${HALL_REPO_START * 100}svh` }}>
        {project.repos.map((repo) => (
          <div
            key={repo.id}
            data-journey-card={`${stop.id}/${repo.id}`}
            className="container flex h-[calc(var(--repo-length)*100svh)] items-end pb-[12svh]"
            style={{ "--repo-length": (stop.length - HALL_REPO_START - HALL_REPO_END) / project.repos.length } as CSSProperties}
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

/**
 * 엔딩. 넓은 화면에서는 패널을 오른쪽에 좁게 두어 왼쪽의 길 전체 내려다보기(drive.ts OVERVIEW)를 가리지 않는다.
 * 스크롤 끝에서 패널 위끝이 헤더(3.5rem, 세로 화면은 진행 막대까지 5rem)보다 0.5rem 아래에 오도록 높이를 화면에 맞추고, 넘치면 패널
 * 안에서 스크롤한다(휠은 useJourneyScroll의 allowNestedScroll). 짧은 휴대폰 화면(사파리 도구 막대가 펴진 높이, 가로 방향)에서 연락처가
 * 헤더 밑으로 숨지 않게 한다.
 * 세로 화면의 아래 여백은 고정 카드와 같은 5svh다.
 */
function EndingStop() {
  const recent = sortedPosts.filter((post) => post.category === "post").slice(0, 3);
  return (
    <div className="container flex h-full items-end pb-[10svh] portrait:pb-[5svh]">
      <div
        className={`${PANEL} max-h-[calc(90svh-4rem)] w-full overflow-y-auto sm:ml-auto sm:max-w-md portrait:max-h-[calc(95svh-5.5rem)]`}
      >
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
          <br />
          차 모델:{" "}
          <a href={CAR_CREDIT.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {CAR_CREDIT.title}
          </a>{" "}
          © 2024 {CAR_CREDIT.author},{" "}
          <a href={CAR_CREDIT.licenseUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {CAR_CREDIT.license}
          </a>
          , 로고 제거·재질 수정
          <br />
          차 모델 디코더:{" "}
          <a href="https://github.com/google/draco" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            Draco
          </a>
          ,{" "}
          <a href="https://github.com/BinomialLLC/basis_universal" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            Basis Universal
          </a>
          ,{" "}
          <a href="/journey/decoders/LICENSE.txt" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            Apache-2.0
          </a>
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
 * 카드(data-journey-card)는 세로 화면에서 3D를 쓰는 동안 화면 아래 고정 자리로 옮겨진다(portraitCards, globals.css).
 * 정류장 높이(정류장 길이 × 100svh)는 3D 배치만 쓴다. 2D면 <html>의 표지로 CSS가 내용 높이의 세로 타임라인으로 바꾸고, 왼쪽 선은
 * --act-color를 쓴다(2-4b, globals.css). 본문 DOM은 하나라 링크·포커스·낭독 순서가 3D와 같다.
 */
export function JourneyContent() {
  return (
    <main data-journey-page className="pointer-events-none relative z-10">
      {STOPS.map((stop) => (
        <section
          key={stop.id}
          id={`stop-${stop.id}`}
          data-stop={stop.id}
          className="relative h-[calc(var(--stop-length)*100svh)]"
          style={
            {
              "--stop-length": stop.length,
              "--act-color": ACT_LINE[stop.kind === "ending" ? 3 : stop.act === 0 ? 1 : stop.act],
            } as CSSProperties
          }
        >
          <StopBody stop={stop} />
        </section>
      ))}
    </main>
  );
}
