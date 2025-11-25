import Image from "next/image";
import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import { FadeIn } from "@/components/FadeIn";
import { TypewriterEffect } from "@/components/TypewriterEffect";

export default function Home() {
  return (
    <main className="container py-10 lg:py-16 space-y-20">
      {/* Hero / Intro Section */}
      <FadeIn>
        <section className="flex flex-col-reverse lg:flex-row gap-10 items-center lg:items-start justify-between">
          <div className="flex flex-col items-start gap-6 flex-1">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight lg:text-6xl min-h-[1.5em]">
                <TypewriterEffect text="이준현" />
              </h1>
              <p className="text-xl text-muted-foreground lg:text-2xl font-medium">
                사용자를 위한 창의적 몰입, 성장을 즐기는 프론트엔드 개발자
              </p>
            </div>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <a 
                href="https://github.com/Ash8382" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                <span>Github: Ash8382</span>
              </a>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <span>one31798883@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Birth:</span> 2000.03.04
              </div>
            </div>
          </div>
          
          <div className="relative w-48 h-48 lg:w-64 lg:h-64 flex-shrink-0 rounded-full overflow-hidden border-4 border-muted/30 shadow-xl">
            <Image
              src="/profile.png"
              alt="이준현 프로필 사진"
              fill
              className="object-cover"
              priority
            />
          </div>
        </section>
      </FadeIn>

      {/* About Section */}
      <FadeIn delay={0.1}>
        <section className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight border-b pb-2">소개</h2>
          <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground text-xl mb-4">
              "기획부터 배포까지, 빈틈을 채우며 서비스를 주도하는 개발자입니다."
            </p>
            <p>
              컴퓨터공학 전공과 전문 교육 과정을 통해 다진 탄탄한 기초를 바탕으로, 현재 <strong>픽케어(Pickcare)</strong>의 프론트엔드 개발자로 근무하고 있습니다.
            </p>
            <p>
              입사 초기 백엔드 개발자가 부재한 상황에서 <strong>백엔드 로직까지 직접 구현</strong>하며 서비스 공백을 메웠고, 
              이후 프론트엔드 코드베이스의 <strong>거의 모든 영역을 주도적으로 리팩토링</strong>하여 유지보수성과 성능을 대폭 개선했습니다. 
              단순 구현에 그치지 않고 <strong>서비스 기획 단계부터 적극 참여</strong>하여 비즈니스 요구사항을 기술적으로 최적화하는 데 기여하고 있습니다.
            </p>
            <p>
              주어진 역할에 한계를 두지 않고, 팀에 필요한 문제를 주도적으로 찾아 해결하는 올라운더 프론트엔드 개발자 입니다.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* Skills Section */}
      <FadeIn delay={0.2}>
        <section className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight border-b pb-2">기술 및 도구</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Frontend
              </h3>
              <div className="flex flex-wrap gap-2">
                {["React", "Next.js", "TypeScript", "Tailwind CSS", "HTML/CSS", "JavaScript", "Zustand", "Framer Motion", "Three.js", "WebGL", "Storybook", "i18n"].map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Backend
              </h3>
              <div className="flex flex-wrap gap-2">
                {["Node.js", "Supabase", "Java"].map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-muted text-muted-foreground rounded-md text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Collaboration & Tools
              </h3>
              <div className="flex flex-wrap gap-2">
                {["Git", "GitHub", "Figma", "Jira", "Slack"].map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-muted text-muted-foreground rounded-md text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Timeline / Activity Section */}
      <FadeIn delay={0.3}>
        <section className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight border-b pb-2">활동 및 경력</h2>
          <div className="space-y-8">
            <div className="relative border-l border-muted ml-2 pl-6 pb-2 space-y-8">
              {[
                {
                  title: "PiCKCARE (픽케어)",
                  role: "Frontend Developer",
                  period: "2025.10 ~ 현재",
                  description: "프론트엔드 개발 및 서비스 기획 참여, 백엔드 로직 지원"
                },
                {
                  title: "PFPlay 개발팀",
                  role: "Team Member",
                  period: "2024.08 ~ 2025.02",
                  description: "사이드 프로젝트 개발 참여"
                },
                {
                  title: "멀티캠퍼스 프론트엔드 개발자 취업캠프",
                  role: "Trainee",
                  period: "2023.08 ~ 2023.12",
                  description: "프론트엔드 심화 과정 수료"
                },
                {
                  title: "현직자&취준생 개발팀 멘티",
                  role: "Mentee",
                  period: "2023.09 ~ 2023.11",
                  description: "현직 개발자 멘토링 참여"
                }
              ].map((item, index) => (
                <div key={index} className="relative">
                  <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background"></span>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-sm text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{item.role}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{item.period}</span>
                  </div>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Education & Certifications */}
      <FadeIn delay={0.4}>
        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight border-b pb-2">학력</h2>
            <ul className="space-y-2">
              <li>
                <h3 className="font-semibold">대덕대학교 컴퓨터공학과</h3>
                <p className="text-sm text-muted-foreground">2019.03 ~ 2022.08</p>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight border-b pb-2">자격증</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground"></span>
                <span>리눅스마스터 2급</span>
              </li>
            </ul>
          </div>
        </section>
      </FadeIn>

      {/* Projects Section (Existing) */}
      <FadeIn delay={0.5}>
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-3xl tracking-tight">프로젝트</h2>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
              전체 보기
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <PostCard
              slug="pfplay"
              title="PFPlay"
              description="PFP NFT와 디제잉을 결합한 Web3 소셜 플랫폼"
              date="2024.08 ~ 2025.02"
              image="/pfplay-thumb.png"
            />
            <PostCard
              slug="tix2u"
              title="Tix2U"
              description="전시, 공연 등 다양한 문화생활 티켓 구매 서비스"
              date="2023.11 ~ 2023.12"
              image="/tix2u-thumb.png"
            />
            <PostCard
              slug="stock2u"
              title="Stock2U"
              description="위치 기반 재고 공유 서비스"
              date="2023.09 ~ 2023.11"
              image="/stock2u-thumb.png"
            />
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
