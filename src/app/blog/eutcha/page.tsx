import Link from "next/link";
import Image from "next/image";

export default function EutchaPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.09.28 ~ 2023.10.09</span>
          <span>•</span>
          <span>Team Project (FE 2명)</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          EUTCHA
        </h1>
        <p className="text-xl text-muted-foreground">
          리액트와 협업에 익숙해지기 위한 프론트엔드 비기너 프로젝트
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {["React", "JavaScript", "Chakra UI", "Emotion", "TMDB API", "ESLint", "Prettier"].map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          <a 
            href="https://github.com/geezers-io/EUTCHA" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub Repository
          </a>
          <a 
            href="https://eutcha.vercel.app/" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.033 16.01c-2.204 0-3.992-1.788-3.992-3.992 0-2.204 1.788-3.992 3.992-3.992 2.204 0 3.992 1.788 3.992 3.992 0 2.204-1.788 3.992-3.992 3.992zm1.132-8.806c-1.365 0-2.472-1.107-2.472-2.472 0-1.365 1.107-2.472 2.472-2.472 1.365 0 2.472 1.107 2.472 2.472 0 1.365-1.107 2.472-2.472 2.472z"/></svg>
            Live Demo
          </a>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src="/eutcha-thumb.png"
          alt="EUTCHA Project Screenshot"
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
          <p>
            EUTCHA는 리액트와 협업에 익숙해지기 위해 진행한 프론트엔드 입문 프로젝트입니다. 
            TMDB Open API를 활용하여 영화 정보를 제공하는 웹 애플리케이션을 구축했습니다.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>주요 특징</strong>
            <ul className="mt-2 mb-0 list-disc list-inside">
              <li>모바일 중심 디자인 (Max-width 1024px)</li>
              <li>TMDB API 기반 영화 데이터 연동</li>
              <li>WhatCha의 컬러셋을 레퍼런스로 활용</li>
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <p>
            프로젝트 전반의 스타일링(CSS)과 주요 페이지 구현을 담당했습니다.
          </p>
          <ul>
            <li>
              <strong>공통 레이아웃 & 스타일</strong>: Header, Home, About 페이지의 CSS 스타일링을 전담하여 일관된 디자인을 구현했습니다.
            </li>
            <li>
              <strong>상세 페이지 (Detail)</strong>: 영화 상세 정보(포스터, 트레일러, 평점, 줄거리 등)를 보여주는 페이지의 라우팅과 스타일을 구현했습니다.
            </li>
            <li>
              <strong>기능 구현</strong>: 인피니트 스크롤(Infinite Scroll) 기능을 직접 구현하며 데이터 페칭 최적화를 학습했습니다.
            </li>
          </ul>
        </section>

        {/* Tech Stack & Rules */}
        <section>
          <h2>기술 스택 및 규칙</h2>
          <ul>
            <li><strong>Framework/Library</strong>: React 18, Chakra UI, Emotion</li>
            <li><strong>Code Quality</strong>: ESLint, Prettier를 도입하여 코드 컨벤션을 유지했습니다.</li>
            <li><strong>API</strong>: TMDB Open API를 활용하여 실제 영화 데이터를 다뤘습니다.</li>
          </ul>
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
