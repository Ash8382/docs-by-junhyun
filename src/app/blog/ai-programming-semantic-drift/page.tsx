import Link from "next/link";

export const metadata = {
  title: "AI 코딩의 근본적 한계와 Semantic Drift 문제 - 이준현",
  description: "LLM이 코드를 생성할 때 발생하는 의미적 드리프트 문제와 해결 아이디어 정리.",
};

export default function AiProgrammingSemanticDriftPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.03.12</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          AI 코딩의 근본적 한계와 Semantic Drift 문제
        </h1>
        <div className="flex flex-wrap gap-2">
          {["AI", "LLM", "코딩"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <figure className="my-8">
          <img
            src="/posts/ai-semantic-drift.png"
            alt="LLM Semantic Drift 개념도"
            className="rounded-lg w-full"
          />
          <figcaption className="text-center text-sm text-muted-foreground mt-2">LLM의 의미적 드리프트 모니터링 개념</figcaption>
        </figure>

        <p>
          흥미로운 글을 읽었다. AI로 코딩할 때 왜 &quot;그럴듯한 코드인데 실행하면 여기저기 터지는&quot; 현상이 반복되는지,
          그리고 그 근본 원인에 대한 새로운 시각을 제시하는 내용이었다.
        </p>

        <section>
          <h2>문제: Semantic Drift (의미적 드리프트)</h2>
          <p>
            AI가 생성한 코드에서 버그가 발견되면 수정을 요청한다. 그런데 수정할수록 다른 곳에서 새로운 오류가 터진다.
            이걸 <strong>의미적 드리프트(Semantic Drift)</strong>라고 부른다.
            버그가 한 군데가 아니라 코드베이스 전반에 산재하고, 하나를 고치면 다른 곳이 깨지는 연쇄 반응이 일어난다.
          </p>
          <p>
            핵심 원인은 LLM이 <strong>평평한(유클리드) 임베딩 공간</strong>에서 동작한다는 점이다.
            이 공간에서는 &quot;정답으로 가는 경로&quot;와 &quot;버그로 가는 경로&quot;의 비용이 동일하다.
            모델 입장에서 두 경로를 구분할 인센티브가 없는 것이다.
          </p>
        </section>

        <section>
          <h2>해결 아이디어: 임베딩 공간에 곡률 부여</h2>
          <p>
            모델을 재학습하거나 파인튜닝하는 대신, 임베딩 공간 자체에 <strong>곡률(geometry)</strong>과
            <strong>에너지 지형(Lyapunov cost field)</strong>을 부여하자는 아이디어다.
          </p>
          <p>
            &quot;버그로 향하는 경로&quot;를 비싸게, &quot;정답으로 향하는 경로&quot;를 싸게 만드는 것이 핵심이다.
          </p>
        </section>

        <section>
          <h2>메커니즘: 추론 시 렌즈(Lens) 보정</h2>
          <p>
            추론 시점에 임베딩을 한 번 보정하는 렌즈를 추가한다.
          </p>
          <ul>
            <li><strong>업데이트 규칙</strong>: Δx = − G⁻¹ ∇C</li>
            <li><strong>C(x)</strong>: 실패/위험(버그, 보안 취약점 등)에 높은 에너지를 부여하는 비용 함수</li>
            <li><strong>G(x)</strong>: 공간의 메트릭으로, &quot;잘못된 방향 이동&quot;을 비싸게 만드는 곡률</li>
          </ul>
          <p>
            이 구조에서 에러 연쇄 경로는 정답 경로 대비 <strong>5~7배</strong> 비용이 커진다고 주장한다.
            측지선(geodesic)과 어트랙터(attractor) 개념을 활용해서, 사후 필터링이 아니라
            <strong>생성 이전부터</strong> 잘못된 경로가 불리해지도록 유도한다는 점이 흥미롭다.
          </p>
        </section>

        <section>
          <h2>운영 관점</h2>
          <p>
            거대 모델은 동결(frozen) 상태로 두고, 수 MB~10MB 정도의 가벼운 렌즈만 주기적으로 업데이트하는 방식이다.
            재학습 대비 비용과 시간이 크게 절감되고, 기저 모델을 건드리지 않으니 회귀(regression) 위험도 낮다.
          </p>
        </section>

        <section>
          <h2>느낀 점</h2>
          <p>
            아직 이론적인 제안 단계이지만, &quot;왜 AI가 코드를 고칠수록 더 꼬이는가&quot;에 대한 설명이 납득이 갔다.
            평평한 임베딩 공간에서는 정답과 오답의 경로 비용이 같다는 관점이 특히 인상적이었다.
            실제 도구로 구현된다면 AI 코딩의 신뢰도가 한 단계 올라갈 수 있을 것 같다.
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
