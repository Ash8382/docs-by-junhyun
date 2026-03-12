import Image from "next/image";
import { FadeIn } from "@/components/FadeIn";
import { TechCarousel } from "@/components/TechCarousel";
import { SkillCards } from "@/components/SkillCards";

export const metadata = {
  title: "소개 - 이준현",
  description: "프론트엔드 개발자 이준현을 소개합니다.",
};

export default function AboutPage() {
  return (
    <main className="container py-10 lg:py-16 max-w-3xl mx-auto space-y-16">
      {/* Profile */}
      <FadeIn>
        <section className="flex flex-col sm:flex-row gap-8 items-start">
          <div className="relative w-32 h-32 flex-shrink-0 rounded-full overflow-hidden border-2 border-muted/30">
            <Image
              src="/profile.png"
              alt="이준현 프로필 사진"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">이준현</h1>
              <p className="text-lg text-muted-foreground mt-1">
                Frontend Developer
              </p>
            </div>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <a
                href="https://github.com/Ash8382"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub: Ash8382
              </a>
              <span>one31798883@gmail.com</span>
              <span>Birth: 2000.03.04</span>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* About */}
      <FadeIn delay={0.1}>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight border-b pb-2">소개</h2>
          <div className="prose dark:prose-invert max-w-none text-muted-foreground">
            <p className="font-semibold text-foreground text-lg">
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
              주어진 역할에 한계를 두지 않고, 팀에 필요한 문제를 주도적으로 찾아 해결하는 올라운더 프론트엔드 개발자입니다.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* Skills */}
      <FadeIn delay={0.2}>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight border-b pb-2">기술 및 도구</h2>
          <TechCarousel />
          <p className="text-sm text-muted-foreground pt-2">
            카드를 클릭하면 뒤집어서 상세 기술 스택을 확인할 수 있습니다.
          </p>
          <SkillCards />
        </section>
      </FadeIn>

      {/* Timeline */}
      <FadeIn delay={0.3}>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight border-b pb-2">활동 및 경력</h2>
          <div className="relative border-l border-muted ml-2 pl-6 space-y-8">
            {[
              {
                title: "PiCKCARE (픽케어)",
                role: "Frontend Developer",
                period: "2025.10 ~ 현재",
                description: "프론트엔드 개발 및 서비스 기획 참여, 백엔드 로직 지원",
              },
              {
                title: "PFPlay 개발팀",
                role: "Team Member",
                period: "2024.08 ~ 2025.02",
                description: "사이드 프로젝트 개발 참여",
              },
              {
                title: "멀티캠퍼스 프론트엔드 개발자 취업캠프",
                role: "Trainee",
                period: "2023.08 ~ 2023.12",
                description: "프론트엔드 심화 과정 수료",
              },
              {
                title: "현직자&취준생 개발팀 멘티",
                role: "Mentee",
                period: "2023.09 ~ 2023.11",
                description: "현직 개발자 멘토링 참여",
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                <h3 className="text-lg font-bold">{item.title}</h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-sm text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">{item.role}</span>
                  <span className="hidden sm:inline">&middot;</span>
                  <span>{item.period}</span>
                </div>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
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
                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                <span>리눅스마스터 2급</span>
              </li>
            </ul>
          </div>
        </section>
      </FadeIn>
    </main>
  );
}
