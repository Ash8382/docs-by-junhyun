import Link from "next/link";
import Image from "next/image";

export default function Tix2UPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.11.17 ~ 2023.12.22</span>
          <span>•</span>
          <span>Team Project (FE 2명)</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Tix2U
        </h1>
        <p className="text-xl text-muted-foreground">
          전시, 공연 등 다양한 문화생활 티켓을 구매할 수 있는 서비스
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {["TypeScript", "Next.js", "React", "Chakra UI", "Supabase", "Figma"].map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          <a 
            href="https://github.com/geezers-io/Tix2U" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub Repository
          </a>
          <a 
            href="https://tix2u.vercel.app/" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.033 16.01c-2.204 0-3.992-1.788-3.992-3.992 0-2.204 1.788-3.992 3.992-3.992 2.204 0 3.992 1.788 3.992 3.992 0 2.204-1.788 3.992-3.992 3.992zm1.132-8.806c-1.365 0-2.472-1.107-2.472-2.472 0-1.365 1.107-2.472 2.472-2.472 1.365 0 2.472 1.107 2.472 2.472 0 1.365-1.107 2.472-2.472 2.472z"/></svg>
            Live Demo (Expired)
          </a>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted mb-12">
        <Image
          src="/tix2u-thumb.png"
          alt="Tix2U Project Screenshot"
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
            Tix2U는 다양한 문화생활을 즐기고 싶은 20~30대와 예술의 알고리즘을 탐구하는 사람들을 위한 티켓 구매 서비스입니다.
            공공 데이터(공연예술통한전산망 API)를 활용하여 실제 공연 정보를 제공하며, 개발자 양성 교육과정의 최종 프로젝트로 진행되었습니다.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>목표</strong>
            <p className="mt-2 mb-0">
              프론트엔드에서의 최대한의 기능을 구현하는 것을 목표로, 기획부터 디자인, 개발, 배포까지 전 과정을 경험했습니다.
            </p>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mt-0">메인 페이지</h3>
              <ul>
                <li>이미지 캐러셀 적용으로 시각적 몰입도 향상</li>
                <li>티켓 포스터 이미지 확대/축소 인터랙션 구현</li>
                <li>로딩 스피너 및 스켈레톤 UI를 통한 UX 개선</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mt-0">카테고리 및 기능</h3>
              <ul>
                <li>Infinite Scroll을 통한 끊김 없는 리스트 탐색 구현</li>
                <li>장바구니 및 찜하기(WishList) 기능 구현</li>
                <li>반응형 디자인 및 ErrorBoundary를 통한 에러 처리</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            <li>
              <strong>단기간 집중 개발</strong>: 1개월이라는 제한된 시간 안에 기획부터 배포까지의 전 과정을 완주하며 타임라인 관리 능력을 길렀습니다.
            </li>
            <li>
              <strong>풀사이클 경험</strong>: 프론트엔드 개발뿐만 아니라 디자인 구성, 서버 구축(Supabase), 배포, 리팩토링까지 경험하며 서비스 전체 구조에 대한 이해를 넓혔습니다.
            </li>
            <li>
              <strong>사용자 중심 UI/UX</strong>: 스켈레톤 UI, 무한 스크롤 등 사용자의 편의성을 고려한 다양한 인터페이스 패턴을 직접 구현했습니다.
            </li>
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30 p-4 rounded-r-lg">
            <h3 className="text-orange-800 dark:text-orange-200 mt-0 mb-2 text-lg font-semibold">참고 사항</h3>
            <p className="text-orange-700 dark:text-orange-300 m-0 text-sm">
              현재 배포된 Vercel 페이지는 연동된 공공 데이터 API의 URL 만료로 인해 정상적으로 데이터가 로드되지 않을 수 있습니다. 
              프로젝트의 소스 코드와 상세 구현 내용은 GitHub 저장소를 통해 확인해 주시면 감사하겠습니다.
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
