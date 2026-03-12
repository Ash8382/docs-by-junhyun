import Link from "next/link";

export const metadata = {
  title: "AI IDE 도구들 비교: Conductor, Claude Code, Antigravity 등 - 이준현",
  description: "Conductor, Claude Code, Antigravity, Tavily, Atlas 등 AI 개발 도구 생태계 정리.",
};

export default function AiIdeTools2025Page() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.02.13</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          AI IDE 도구들 비교: Conductor, Claude Code, Antigravity 등
        </h1>
        <div className="flex flex-wrap gap-2">
          {["AI", "IDE", "Claude Code", "개발도구"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <p>
          주변 개발자들과 AI 개발 도구에 대해 이야기를 나눴다.
          각자 사용하는 도구와 워크플로우가 달라서 흥미로웠고, 주요 내용을 정리해본다.
        </p>

        <section>
          <h2>Conductor - Git Worktree 기반 병렬 AI 작업</h2>
          <p>
            <a href="https://docs.conductor.build/" target="_blank" rel="noreferrer">Conductor</a>는
            AI를 활용한 병렬 작업에 특화된 도구다.
            가장 재미있는 점은 <strong>Git Worktree</strong>를 활용한다는 것이다.
          </p>
          <p>
            AI 에이전트마다 독립된 작업 공간(워크트리)을 자동으로 생성해서 돌리기 때문에,
            내 작업 흐름을 끊지 않고도 여러 브랜치의 작업을 동시에 AI에게 맡길 수 있다.
            AI가 돌아가는 동안 다른 워크트리에서 리팩토링이나 UI 수정 작업을 병행하는 식이다.
          </p>
          <p>
            워크트리에서 git push하면 PR도 자동 생성해주고, PR 내용도 Claude가 작성해준다.
            팀 단위 작업에서 특히 유용해 보인다.
          </p>
          <p>
            다만 현재 Conductor에서는 Claude Code 외에 다른 코드 모델은 사용할 수 없는 것 같다.
            대신 터미널을 통해 다른 AI 도구를 실행할 수는 있다.
          </p>
        </section>

        <section>
          <h2>Claude Code (CC) - 터미널 중심 AI 코딩</h2>
          <p>
            에디터를 거의 열지 않고 <strong>Claude Code CLI로만 작업</strong>하는 분도 있었다.
            VSCode extension도 있어서 에디터와 결합해서 쓸 수도 있다.
          </p>
          <p>
            Git Worktree 기반 병렬 작업은 CC를 포함한 여러 플랫폼에서 지원하고 있다.
            다만 Opus 등장 이후로는 굳이 워크트리를 안 써도 한 세션에서 여러 기능 작업 시
            충돌이 생각보다 적다는 의견도 있었다. 코드베이스에서 병렬로 작업을 진행시키는 것도
            나쁘지 않다는 것이다.
          </p>
        </section>

        <section>
          <h2>Antigravity</h2>
          <p>
            Antigravity IDE를 사용하되, 에디터 내장 AI 기능은 tab 자동완성 정도만 활용하고
            실제 코딩 작업은 CLI 기반 AI에 의존하는 워크플로우도 있었다.
            Antigravity의 Agent Manager 기능이 Conductor와 유사한 부분이 있다고 한다.
          </p>
        </section>

        <section>
          <h2>기타 유용한 도구들</h2>
          <ul>
            <li>
              <strong><a href="https://www.tavily.com/" target="_blank" rel="noreferrer">Tavily</a></strong>:
              Claude의 RAG(검색 증강 생성)을 위한 서비스.
              연결하면 API, 프레임워크에 대한 최신 정보를 효율적으로 가져올 수 있다.
              &quot;클로드 RAG 종결 서비스&quot;라는 평가도 있었다.
            </li>
            <li>
              <strong>Atlas 브라우저</strong>:
              Codex 5.3, Codex APP 출시와 함께 대규모 업데이트.
              수직 탭, 그룹화 기능, Rust 기반 메모리 효율화가 특징이다.
              Comet은 탭 몇 개만 띄워도 메모리 10GB를 먹는 반면,
              Atlas는 메모리 점유율에 잡히지도 않을 정도로 가볍다고 한다.
            </li>
            <li>
              <strong>OpenAI Codex Spark</strong>:
              새로 출시된 코드 생성 모델.
            </li>
            <li>
              <strong>카카오 GPT Pro</strong>:
              월 30만원짜리 GPT Pro를 카카오에서 3만원에 판매 중이라는 정보도 나왔다.
            </li>
          </ul>
        </section>

        <section>
          <h2>느낀 점</h2>
          <p>
            AI 개발 도구 생태계가 정말 빠르게 변하고 있다.
            에디터를 거의 안 열고 CLI만으로 작업하는 워크플로우가 실제로 가능해졌다는 게 인상적이다.
            Conductor처럼 병렬 작업을 시각화하고 관리하는 도구도 점점 나오고 있어서,
            &quot;AI에게 일 시키고 다른 일 하기&quot;가 자연스러운 개발 방식이 되어가는 것 같다.
          </p>
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
