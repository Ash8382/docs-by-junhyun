import Link from "next/link";
import Image from "next/image";

export default function PFPlayPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2024.08.04 ~ 2025.02.02</span>
          <span>•</span>
          <span>Team Project</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl text-zinc-950 dark:text-zinc-50">
          PFPlay
        </h1>
        <p className="text-xl text-zinc-700 dark:text-zinc-300">
          PFP NFT와 디제잉을 결합한 소셜 플랫폼
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {["TypeScript", "Next.js", "React", "Tailwind CSS", "Zustand", "Jest", "Storybook"].map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          <a 
            href="https://github.com/pfplay/pfplay-web" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline text-zinc-700 dark:text-zinc-300"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub Repository
          </a>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src="/pfplay-thumb.png"
          alt="PFPlay Project Screenshot"
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
          <p className="text-zinc-800 dark:text-zinc-200 mb-4">
            PFPlay는 PFP(Profile Picture) NFT와 디제잉 문화를 결합한 Web3 기반 소셜 플랫폼입니다. 
            사용자는 자신의 NFT를 활용해 아이덴티티를 표현하고, 음악을 통해 다른 사용자들과 소통할 수 있습니다.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong className="text-zinc-900 dark:text-zinc-100">개발 인원 (총 9명)</strong>
            <ul className="mt-2 mb-0 list-disc list-inside text-zinc-800 dark:text-zinc-200">
              <li>PM 2명</li>
              <li>Frontend 3명 (본인 참여)</li>
              <li>Backend 2명</li>
              <li>Design 1명</li>
              <li>Marketing 1명</li>
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-zinc-950 dark:text-zinc-50">담당 역할</h2>
          <ul className="space-y-3 list-disc list-inside text-zinc-800 dark:text-zinc-200">
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">디제잉 규칙 안내 모달 구현</strong>: 디제잉 등록 전 사용자에게 필수 규칙을 안내하는 모달을 구현하여 UX 흐름을 개선했습니다.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">로그인 페이지 개편</strong>: 기존 로그인 페이지의 UI/UX를 전면적으로 리뉴얼하여 사용자 접근성을 높였습니다.
            </li>
          </ul>
        </section>

        {/* Achievements */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-zinc-950 dark:text-zinc-50">성과 및 배운 점</h2>
          <ul className="space-y-3 list-disc list-inside text-zinc-800 dark:text-zinc-200">
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">실무 수준의 프론트엔드 환경 경험</strong>: 글로벌 사용자 대상의 Web3 플랫폼을 개발하며 다국어 지원(i18n), 디자인 시스템 구축(Storybook) 등 최신 개발 트렌드를 실전에서 익혔습니다.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">협업 커뮤니케이션 능력 향상</strong>: PM, 백엔드, 디자이너, 마케터 등 다양한 직군과의 긴밀한 협업을 통해 대규모 프로젝트의 워크플로우를 이해했습니다.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">UX 중심의 기능 구현</strong>: 단순한 기능 구현을 넘어, 사용자 경험(UX)을 고려한 모달 및 로그인 페이지 설계를 통해 서비스 품질을 높였습니다.
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-100">코드 품질 및 유지보수</strong>: 실무 멘토링을 통해 유지보수 가능한 코드 작성법과 컴포넌트 설계 원칙을 학습하고 적용했습니다.
            </li>
          </ul>
        </section>

        {/* Background Note */}
        <section>
          <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-r-lg">
            <h3 className="text-yellow-800 dark:text-yellow-200 mt-0 mb-2 text-lg font-semibold">참고 사항</h3>
            <p className="text-yellow-700 dark:text-yellow-300 m-0 text-sm">
              본 프로젝트는 투자 유치 및 수익 구조 설계 단계까지 진행되었으나, 개인적인 취업 준비 기간이 길어짐에 따라 부득이하게 중도 하차하게 되었습니다. 
              비록 끝까지 함께하지는 못했지만, 초기 기획부터 핵심 기능 구현 단계까지 열정적으로 참여하며 많은 성장을 이룬 프로젝트입니다.
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
