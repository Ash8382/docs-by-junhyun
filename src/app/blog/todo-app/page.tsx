import Link from "next/link";
import Image from "next/image";

export default function TodoAppPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.05.01 ~ 2023.06.01</span>
          <span>•</span>
          <span>Individual Project (with Mentor)</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Todo App
        </h1>
        <p className="text-xl text-muted-foreground">
          프론트엔드 입문자를 위한 Todo App 만들기 과제
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {["HTML5", "CSS3", "JavaScript"].map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-2">
          <a 
            href="https://github.com/geezers-io/todo-app-assignment" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub Repository
          </a>
          <a 
            href="https://geezers-io.github.io/todo-app-assignment/" 
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
          src="/todo-app-thumb.png"
          alt="Todo App Screenshot"
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
            HTML, CSS, 그리고 순수 JavaScript만을 사용하여 구현한 Todo List 애플리케이션입니다. 
            프론트엔드 개발의 기초를 다지기 위한 과제 프로젝트로 진행되었습니다.
          </p>
        </section>

        {/* Achievements */}
        <section>
          <h2>성과 및 배운 점</h2>
          <ul>
            <li>
              <strong>기본기 강화</strong>: HTML5와 CSS3를 활용하여 시맨틱한 마크업과 레이아웃을 구성하고, JavaScript로 동적인 기능을 구현하며 웹 개발의 핵심 기초를 다졌습니다.
            </li>
            <li>
              <strong>상태 관리 이해</strong>: 외부 라이브러리 없이 순수 JavaScript로 데이터의 상태(State)를 관리하고 UI에 반영하는 과정을 통해 프론트엔드 개발의 기본적인 데이터 흐름을 익혔습니다.
            </li>
            <li>
              <strong>사용자 경험(UX) 고려</strong>: 단순한 기능 구현을 넘어, 사용자가 직관적으로 사용할 수 있는 디자인과 인터랙션을 고민하고 적용했습니다.
            </li>
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
