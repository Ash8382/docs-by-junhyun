import Link from "next/link";
import Image from "next/image";

export default function KokoaClonePage() {
  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.04.01 ~ 2023.05.01</span>
          <span>•</span>
          <span>Individual Project</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          코코아톡 (Kokoa Clone)
        </h1>
        <p className="text-xl text-muted-foreground">
          HTML과 CSS로 구현한 카카오톡 클론 코딩
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {["HTML5", "CSS3"].map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          <a 
            href="https://github.com/Ellsy23/kokoa-clone-2023" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub Repository
          </a>
          <a 
            href="https://ellsy23.github.io/kokoa-clone-2023/" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.033 16.01c-2.204 0-3.992-1.788-3.992-3.992 0-2.204 1.788-3.992 3.992-3.992 2.204 0 3.992 1.788 3.992 3.992 0 2.204-1.788 3.992-3.992 3.992zm1.132-8.806c-1.365 0-2.472-1.107-2.472-2.472 0-1.365 1.107-2.472 2.472-2.472 1.365 0 2.472 1.107 2.472 2.472 0 1.365-1.107 2.472-2.472 2.472z"/></svg>
            Live Demo (Check Note)
          </a>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src="/kokoa-clone-thumb.png"
          alt="Kokoa Clone Project Screenshot"
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
            노마드코더의 카카오톡 클론 코딩 강의를 수강하며 진행한 프로젝트입니다. 
            HTML과 CSS에 대한 개념을 확실히 이해하고, 실제 애플리케이션의 UI를 직접 구현해보며 실전 감각을 익히는 것을 목표로 했습니다.
          </p>
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            <li>
              <strong>UI/UX 정밀 구현</strong>: HTML과 CSS만을 사용하여 카카오톡의 사용자 인터페이스를 픽셀 단위로 정교하게 재현했습니다. 이를 통해 레이아웃 구성과 스타일링 능력을 크게 향상시켰습니다.
            </li>
            <li>
              <strong>반응형 디자인</strong>: 다양한 화면 크기에서도 깨지지 않고 자연스럽게 동작하는 반응형 웹 페이지를 구현했습니다.
            </li>
            <li>
              <strong>웹 표준 준수</strong>: 시맨틱 태그를 적절히 활용하여 웹 접근성과 표준을 준수하는 마크업을 작성했습니다.
            </li>
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-r-lg">
            <h3 className="text-red-800 dark:text-red-200 mt-0 mb-2 text-lg font-semibold">배포 상태 안내</h3>
            <p className="text-red-700 dark:text-red-300 m-0 text-sm">
              현재 배포된 페이지에서 CSS 파일 로드 문제(CSP 정책 및 404 에러)로 인해 스타일이 정상적으로 적용되지 않을 수 있습니다. 
              정확한 구현 화면과 코드는 GitHub 저장소를 통해 확인해 주시면 감사하겠습니다.
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
