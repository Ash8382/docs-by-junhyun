import Link from "next/link";

export const metadata = {
  title: "Context7 MCP 설치 및 사용법 — AI 코딩에 최신 문서를 주입하는 방법 - 이준현",
  description: "Context7 MCP를 설치하고 활용하여 AI 코딩 시 최신 라이브러리 문서를 실시간으로 주입하는 방법 정리.",
};

export default function Context7McpGuidePage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2026.03.17</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Context7 MCP 설치 및 사용법 — AI 코딩에 최신 문서를 주입하는 방법
        </h1>
        <div className="flex flex-wrap gap-2">
          {["AI", "MCP", "Context7", "Claude Code", "개발도구"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">

        <figure className="my-8">
          <img
            src="/posts/context7-og.png"
            alt="Context7 MCP - Upstash"
            className="rounded-lg w-full"
          />
          <figcaption className="text-center text-sm text-muted-foreground mt-2">Context7 — AI에 최신 라이브러리 문서를 실시간 주입하는 MCP 서버</figcaption>
        </figure>

        {/* 도입 */}
        <p>
          AI로 코딩할 때 가장 답답한 순간은 언제일까?
          바로 AI가 <strong>이미 deprecated된 API</strong>를 자신 있게 추천하거나,
          <strong>존재하지 않는 함수</strong>를 만들어낼 때다.
          LLM은 훈련 시점의 정적 데이터로만 학습하기 때문에, 라이브러리가 빠르게 업데이트되는 프론트엔드 생태계에서는 이 문제가 특히 심각하다.
        </p>

        <p>
          <strong>Context7 MCP</strong>는 이 문제를 정면으로 해결한다.
          Upstash에서 개발한 오픈소스 MCP 서버로, 프롬프트에 &quot;use context7&quot;만 붙이면
          AI가 <strong>최신 라이브러리 문서와 코드 예제를 실시간으로 참조</strong>하면서 답변을 생성한다.
        </p>

        {/* 기존 AI 코딩의 한계 */}
        <section>
          <h2>기존 AI 코딩의 한계</h2>
          <p>
            AI 코딩 도구를 써본 사람이라면 다음과 같은 경험이 한 번쯤은 있을 것이다.
          </p>
          <ul>
            <li><strong>Deprecated API 추천</strong> — React Query v3 문법을 v5 프로젝트에 제안</li>
            <li><strong>할루시네이션</strong> — 실제로 존재하지 않는 함수나 옵션을 생성</li>
            <li><strong>버전 미고려</strong> — Next.js Pages Router 코드를 App Router 프로젝트에 제안</li>
            <li><strong>정적 학습 데이터</strong> — 훈련 데이터 커트오프 이후의 변경사항 반영 불가</li>
          </ul>
          <p>
            이런 문제들은 결국 AI가 &quot;구버전 문서&quot;만 알고 있기 때문에 발생한다.
            Context7은 AI에게 <strong>최신 공식 문서를 실시간으로 주입</strong>함으로써 이 근본 원인을 해결한다.
          </p>
        </section>

        {/* Context7 MCP란? */}
        <section>
          <h2>Context7 MCP란?</h2>
          <p>
            Context7은 MCP(Model Context Protocol) 서버로,
            AI 모델이 코드를 생성할 때 <strong>최신 라이브러리 문서를 자동으로 조회</strong>하여 컨텍스트에 주입해준다.
          </p>
          <p>핵심 기능은 다음과 같다.</p>
          <ul>
            <li><strong>resolve-library-id</strong> — 라이브러리 이름을 Context7 내부 ID로 자동 변환</li>
            <li><strong>get-library-docs</strong> — 해당 라이브러리의 최신 공식 문서를 실시간 조회</li>
            <li><strong>자동 라이브러리 감지</strong> — 프롬프트를 분석해서 관련 라이브러리를 자동으로 파악</li>
            <li><strong>문맥 기반 필터링</strong> — 질문 의도에 맞는 문서 섹션만 선별</li>
            <li><strong>버전별 호환성</strong> — 사용 중인 버전에 맞는 예제 코드를 제공</li>
          </ul>
          <p>
            완전 무료 오픈소스이며, GitHub에서 소스 코드를 확인할 수 있다.
            다만 실시간 문서 조회 방식이므로 인터넷 연결이 필수다.
          </p>
        </section>

        {/* 설치 방법 */}
        <section>
          <h2>설치 방법</h2>

          <h3>Claude Desktop</h3>
          <p>
            Claude Desktop의 MCP 설정 파일에 다음을 추가한다.
          </p>
          <pre><code>{`{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}`}</code></pre>

          <h3>Cursor</h3>
          <p>
            <strong>Settings → Tools & Integrations → New MCP Server</strong>에서
            위와 동일한 JSON 설정을 추가하면 된다.
          </p>

          <h3>Claude Code (CLI)</h3>
          <p>
            CLI 환경에서는 한 줄 명령어로 설치할 수 있다.
          </p>
          <pre><code>{`claude mcp add --transport http context7 https://mcp.context7.com/mcp`}</code></pre>

          <h3>Gemini CLI</h3>
          <p>
            Gemini CLI의 설정 파일(<code>~/.gemini/settings.json</code>)에 동일한 형식으로 추가한다.
          </p>
          <pre><code>{`{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}`}</code></pre>
        </section>

        {/* 사용 방법 */}
        <section>
          <h2>사용 방법</h2>
          <p>
            사용법은 놀라울 정도로 간단하다.
            기존 프롬프트 끝에 <strong>&quot;use context7&quot;</strong>만 추가하면 된다.
            그러면 Context7이 자동으로 관련 라이브러리를 감지하고, 최신 문서를 가져와서 AI 컨텍스트에 주입한다.
          </p>

          <h3>프론트엔드 예시</h3>

          <h4>Next.js App Router 미들웨어</h4>
          <pre><code>{`Next.js 14에서 쿠키의 JWT를 검증하고
미인증 사용자를 /login으로 리다이렉트하는
미들웨어를 만들어줘. use context7`}</code></pre>

          <h4>React Query v5 + 무한 스크롤</h4>
          <pre><code>{`React Query v5와 TanStack Router를 사용해서
무한 스크롤이 있는 포스트 목록 페이지를 만들어줘. use context7`}</code></pre>

          <h4>Tailwind CSS 최신 기능</h4>
          <pre><code>{`새로운 Dynamic Viewport 유닛(dvh)과 컨테이너 쿼리를 사용해서
모바일에서 완벽한 full-height 레이아웃을 만들어줘. use context7`}</code></pre>

          <h3>백엔드 예시</h3>

          <h4>FastAPI + SQLAlchemy</h4>
          <pre><code>{`FastAPI에서 JWT 인증과 RBAC 권한 시스템이 포함된
사용자 관리 CRUD API를 만들어줘. use context7`}</code></pre>

          <h4>MongoDB Aggregation</h4>
          <pre><code>{`MongoDB에서 주문 데이터를 월별로 그룹핑하고
총액을 계산하는 aggregation 파이프라인을 작성해줘. use context7`}</code></pre>

          <h3>클라우드 & DevOps 예시</h3>

          <h4>Cloudflare Workers</h4>
          <pre><code>{`Cloudflare Worker로 JSON API 응답을 5분간 캐시하고
CORS 헤더를 설정하는 프록시 서버를 만들어줘. use context7`}</code></pre>

          <h4>Stripe Payment Intent</h4>
          <pre><code>{`Stripe의 최신 Payment Intent API로 구독 결제 시스템을 구현해줘.
웹훅으로 결제 상태 동기화도 포함해서. use context7`}</code></pre>
        </section>

        {/* MCP 조합 활용 */}
        <section>
          <h2>다른 MCP와 조합하기</h2>
          <p>
            Context7의 진짜 힘은 다른 MCP 서버와 조합할 때 나온다.
            MCP 생태계의 장점은 여러 서버를 동시에 연결할 수 있다는 것이다.
          </p>
          <ul>
            <li>
              <strong>Context7 + GitHub MCP</strong> — 최신 문서를 참조하면서 레포지토리 코드를 분석.
              &quot;이 코드를 최신 API로 마이그레이션해줘&quot; 같은 요청에 강력하다.
            </li>
            <li>
              <strong>Context7 + PostgreSQL MCP</strong> — 라이브러리 문서 + 실제 DB 스키마를 동시에 참조.
              ORM 코드 생성 시 실제 테이블 구조에 맞는 코드를 만들어준다.
            </li>
            <li>
              <strong>Context7 + Slack MCP</strong> — 개발 문서 참조 + 팀 커뮤니케이션.
              기술적 질문에 대한 답변을 문서 기반으로 팀 채널에 공유할 수 있다.
            </li>
          </ul>
        </section>

        {/* 실제 사용 소감 */}
        <section>
          <h2>실제로 써보니</h2>
          <p>
            직접 써보면서 느낀 점은, <strong>&quot;use context7&quot; 한 마디가 생각보다 큰 차이</strong>를 만든다는 것이다.
            특히 빠르게 업데이트되는 라이브러리(Next.js, React Query, Tailwind 등)를 다룰 때
            deprecated 코드를 받아서 삽질하는 시간이 확실히 줄었다.
          </p>
          <p>
            다만 모든 라이브러리를 지원하지는 않고, 인터넷 연결이 필수라는 점은 알아둬야 한다.
            주요 라이브러리 대부분은 지원하며, 미지원 라이브러리도 요청하면 추가해준다고 한다.
          </p>
          <p>
            AI 코딩 도구를 본격적으로 쓰고 있다면 Context7은 거의 필수에 가까운 MCP라고 생각한다.
            설치 1분, 사용법 &quot;use context7&quot; 한 줄이면 끝이니 한번 설치해보길 추천한다.
          </p>
        </section>

        {/* 참고 자료 */}
        <section>
          <h2>참고</h2>
          <ul>
            <li>
              <a href="https://github.com/upstash/context7" target="_blank" rel="noreferrer">
                Context7 GitHub 레포지토리
              </a>
            </li>
            <li>
              <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">
                Model Context Protocol 공식 문서
              </a>
            </li>
            <li>
              <a href="https://goddaehee.tistory.com/391" target="_blank" rel="noreferrer">
                갓대희 - Context7 MCP 설치 및 사용방법 (원본 참고 글)
              </a>
            </li>
          </ul>
        </section>

        <div className="mt-12 pt-8 border-t">
          <Link href="/blog" className="text-primary hover:underline">
            &larr; 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </article>
  );
}
