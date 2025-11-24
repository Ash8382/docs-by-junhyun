import Link from "next/link";
import Image from "next/image";

export default function Stock2UPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.09.21 ~ 2023.11.16</span>
          <span>•</span>
          <span>Team Project (5명)</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Stock2U
        </h1>
        <p className="text-xl text-muted-foreground">
          위치 기반 재고 공유 서비스
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {["TypeScript", "React", "Chakra UI", "Zustand", "Figma", "Jira"].map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          <a 
            href="https://github.com/geezers-io/Stock2U-front" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub Repository
          </a>
          <a 
            href="https://stock2u-front.vercel.app/" 
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
          src="/stock2u-thumb.png"
          alt="Stock2U Project Screenshot"
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
            Stock2U는 판매자와 소비자를 연결하여 위치 기반으로 재고 상품을 공유하고 판매할 수 있는 서비스입니다. 
            해커톤 K-Digital Training 대회 출전용 프로젝트로 시작하여 본선에 진출하는 성과를 거두었습니다.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg text-sm">
            <strong>개발 인원 (총 5명)</strong>
            <ul className="mt-2 mb-0 list-disc list-inside">
              <li>Frontend 3명 (본인 참여)</li>
              <li>Backend 2명</li>
            </ul>
          </div>
        </section>

        {/* Role */}
        <section>
          <h2>담당 역할</h2>
          <ul>
            <li>
              <strong>UI/UX 디자인 및 퍼블리싱</strong>: 메인 페이지의 디자인을 설계하고 반응형 웹으로 구현하여 사용자 접근성을 높였습니다.
            </li>
            <li>
              <strong>마이페이지 구현</strong>: 일반 사용자와 판매자용 마이페이지를 각각 구현하여 사용자 유형에 따른 맞춤형 기능을 제공했습니다.
            </li>
            <li>
              <strong>REST API 연동</strong>: 백엔드 API와 프론트엔드를 연동하여 실제 데이터를 처리하고 화면에 표시했습니다.
            </li>
          </ul>
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            <li>
              <strong>협업 프로세스 체득</strong>: 백엔드 개발자와의 첫 협업 프로젝트로서, Swagger UI를 활용한 API 명세서 확인 및 호출 방식 논의를 통해 효율적인 소통의 중요성을 깨달았습니다.
            </li>
            <li>
              <strong>새로운 툴 적응</strong>: Jira, Figma 등 실무에서 사용되는 협업 툴을 처음 도입하여 프로젝트 관리 및 디자인 커뮤니케이션 능력을 키웠습니다.
            </li>
            <li>
              <strong>문제 해결 능력</strong>: PM과 프론트엔드 역할을 병행하며 팀 내 이슈를 조율하고 프로젝트 일정을 관리하는 경험을 했습니다.
            </li>
          </ul>
        </section>

        {/* Note */}
        <section>
          <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-r-lg">
            <h3 className="text-red-800 dark:text-red-200 mt-0 mb-2 text-lg font-semibold">배포 상태 안내</h3>
            <p className="text-red-700 dark:text-red-300 m-0 text-sm">
              현재 Vercel을 통해 배포된 사이트는 백엔드 서버와의 연결 문제 또는 배포 설정 이슈로 인해 정상적으로 접속되지 않을 수 있습니다. 
              이는 프로젝트 종료 후 유지보수 기간이 만료되었거나 외부 API 의존성 문제일 수 있습니다. 
              상세한 코드 구조와 구현 내용은 GitHub 저장소를 참고해 주시기 바랍니다.
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
