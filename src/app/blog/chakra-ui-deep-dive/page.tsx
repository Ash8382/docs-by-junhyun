import Link from "next/link";

export const metadata = {
  title: "Chakra UI 레퍼런스를 통째로 씹어먹은 이야기 - 이준현",
  description: "EUTCHA 프로젝트를 하면서 Chakra UI 공식 문서를 외우다시피 공부한 경험. 컴포넌트 시스템, 테마 커스터마이징, Responsive Style 등 실전 활용기.",
};

export default function ChakraUiDeepDivePage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2023.10.05</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Chakra UI 레퍼런스를 통째로 씹어먹은 이야기
        </h1>
        <div className="flex flex-wrap gap-2">
          {["Chakra UI", "React", "CSS-in-JS", "EUTCHA"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <figure className="my-8">
          <img
            src="/posts/chakra-ui-og.png"
            alt="Chakra UI"
            className="rounded-lg w-full"
          />
        </figure>

        <p>
          EUTCHA 프로젝트를 시작하면서 UI 라이브러리로 Chakra UI를 선택했다.
          React를 배운 지 2주밖에 안 된 시점이었는데,
          &quot;어차피 쓸 거면 제대로 알고 쓰자&quot;는 생각으로
          <strong>공식 문서 레퍼런스를 거의 외우다시피 공부했다.</strong>
          돌이켜보면 이때 잡은 기초가 이후 프로젝트에서도 계속 써먹을 수 있는 밑바탕이 됐다.
        </p>

        <section>
          <h2>왜 Chakra UI였나</h2>
          <p>
            당시 선택지는 MUI, Ant Design, Chakra UI 정도였다.
            MUI는 Material Design에 강하게 바인딩되어 있어서 커스터마이징이 번거로웠고,
            Ant Design은 디자인 톤이 프로젝트와 맞지 않았다.
          </p>
          <p>
            Chakra UI를 고른 이유는 명확했다.
          </p>
          <ul>
            <li><strong>Style Props</strong> — CSS를 별도 파일 없이 컴포넌트에 직접 작성. React적인 사고와 잘 맞았다.</li>
            <li><strong>접근성 기본 내장</strong> — 모든 컴포넌트가 WAI-ARIA 표준을 따른다.</li>
            <li><strong>Composition 우선</strong> — 작은 컴포넌트를 조합해서 큰 컴포넌트를 만드는 React 패턴과 철학이 같다.</li>
            <li><strong>문서가 좋다</strong> — 예제 코드가 풍부하고, 각 prop의 설명이 상세하다.</li>
          </ul>
        </section>

        <section>
          <h2>공식 문서 공부법 — 전부 읽고, 전부 쳐보기</h2>
          <p>
            공부 방법은 단순했다. Chakra UI 공식 사이트의 컴포넌트 레퍼런스를
            <strong>처음부터 끝까지 전부 읽고, 예제 코드를 전부 직접 쳐봤다.</strong>
          </p>
          <p>
            Layout 컴포넌트(<code>Box</code>, <code>Flex</code>, <code>Grid</code>, <code>Stack</code>, <code>Container</code>)부터 시작해서,
            Form 컴포넌트(<code>Input</code>, <code>Select</code>, <code>Checkbox</code>, <code>Radio</code>),
            Feedback 컴포넌트(<code>Toast</code>, <code>Alert</code>, <code>Skeleton</code>),
            Overlay 컴포넌트(<code>Modal</code>, <code>Drawer</code>, <code>Popover</code>, <code>Tooltip</code>)까지
            — 말 그대로 전 카테고리를 훑었다.
          </p>
          <p>
            시간은 오래 걸렸지만, 이렇게 하니까 &quot;이런 UI를 만들려면 어떤 컴포넌트를 쓰면 되지?&quot;라는 질문에
            바로 답이 나왔다. 검색할 필요가 없어지니 구현 속도가 확 올랐다.
          </p>
        </section>

        <section>
          <h2>Style Props 시스템 이해하기</h2>
          <p>
            Chakra UI의 핵심은 <strong>Style Props</strong>다.
            CSS 속성을 축약형 prop으로 컴포넌트에 직접 전달한다.
          </p>
          <pre className="text-sm"><code>{`// 기존 CSS 방식
<div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#eee' }}>

// Chakra UI Style Props
<Box mt={4} p={2} bg="gray.100">
  {/* mt={4}는 margin-top: 1rem (4 * 0.25rem) */}
</Box>`}</code></pre>
          <p>
            처음에는 <code>mt</code>, <code>px</code>, <code>bg</code> 같은 축약어가 익숙하지 않았는데,
            며칠 지나니 오히려 일반 CSS보다 빠르게 작성할 수 있었다.
            숫자 기반 spacing 시스템(4 = 1rem, 8 = 2rem)도 일관된 간격을 유지하는 데 큰 도움이 됐다.
          </p>
          <p>
            특히 <strong>Responsive Style</strong>이 인상적이었다.
            미디어 쿼리를 직접 작성하는 대신, 배열이나 객체로 반응형 값을 지정할 수 있다.
          </p>
          <pre className="text-sm"><code>{`// 배열 문법: [모바일, 태블릿, 데스크탑]
<Box fontSize={['sm', 'md', 'lg']} p={[2, 4, 8]}>
  반응형 텍스트
</Box>

// 객체 문법
<Flex direction={{ base: 'column', md: 'row' }}>
  <Box flex={1}>사이드바</Box>
  <Box flex={2}>메인 콘텐츠</Box>
</Flex>`}</code></pre>
          <p>
            EUTCHA 프로젝트가 모바일 중심 디자인(Max-width 1024px)이었는데,
            이 반응형 문법 덕분에 미디어 쿼리를 하나도 직접 작성하지 않고도 전체 반응형을 구현할 수 있었다.
          </p>
        </section>

        <section>
          <h2>테마 커스터마이징</h2>
          <figure className="my-6">
            <img
              src="/posts/chakra-ui-theme.png"
              alt="Chakra UI 테마 커스터마이징"
              className="rounded-lg w-full"
            />
            <figcaption className="text-center text-sm text-muted-foreground mt-2">Chakra UI 테마 커스터마이징 시스템</figcaption>
          </figure>
          <p>
            EUTCHA에서는 왓챠(Watcha)의 컬러셋을 레퍼런스로 활용했는데,
            Chakra UI의 <code>extendTheme</code>으로 깔끔하게 적용할 수 있었다.
          </p>
          <pre className="text-sm"><code>{`const theme = extendTheme({
  colors: {
    brand: {
      50: '#fff0f0',
      100: '#ffd6d6',
      500: '#ff0558',  // 왓챠 메인 컬러
      600: '#e6004e',
      900: '#800029',
    },
  },
  fonts: {
    heading: "'Noto Sans KR', sans-serif",
    body: "'Noto Sans KR', sans-serif",
  },
});`}</code></pre>
          <p>
            <code>brand</code>로 커스텀 컬러를 정의하면 <code>colorScheme=&quot;brand&quot;</code>로
            버튼, 뱃지, 체크박스 등 모든 컴포넌트에 일괄 적용된다.
            50~900까지의 색상 스케일이 자동으로 hover, active, disabled 상태에 매핑되는 구조가 특히 편했다.
          </p>
        </section>

        <section>
          <h2>Composition 패턴 — 작은 것을 조합하기</h2>
          <p>
            Chakra UI를 쓰면서 React의 Composition 패턴을 자연스럽게 체득했다.
            Chakra UI의 컴포넌트들은 하나의 거대한 컴포넌트가 아니라,
            작은 조각을 조합해서 원하는 UI를 만드는 방식이다.
          </p>
          <pre className="text-sm"><code>{`// Modal을 Composition으로 구성
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>영화 상세</ModalHeader>
    <ModalCloseButton />
    <ModalBody>
      {/* 내용 */}
    </ModalBody>
    <ModalFooter>
      <Button onClick={onClose}>닫기</Button>
    </ModalFooter>
  </ModalContent>
</Modal>`}</code></pre>
          <p>
            이 패턴에 익숙해지니, 나중에 다른 라이브러리(Radix UI, shadcn/ui 등)를 접해도
            &quot;아, Compound Component 패턴이구나&quot; 하고 바로 이해할 수 있었다.
            Chakra UI에서 배운 Composition 사고방식이 가장 큰 수확이었다.
          </p>
        </section>

        <section>
          <h2>실전에서 특히 많이 쓴 컴포넌트들</h2>
          <p>
            EUTCHA에서 실제로 가장 많이 사용한 컴포넌트들을 정리하면:
          </p>
          <ul>
            <li><strong>Flex / Stack</strong> — 레이아웃의 90%를 이 둘로 해결했다. <code>VStack</code>, <code>HStack</code>으로 방향별 정렬이 한 줄이면 끝난다.</li>
            <li><strong>Skeleton</strong> — 영화 데이터 로딩 중 UI. <code>isLoaded</code> prop 하나로 로딩/완료 전환이 자동이다.</li>
            <li><strong>useDisclosure</strong> — 모달, 드로어의 open/close 상태를 관리하는 커스텀 훅. <code>isOpen</code>, <code>onOpen</code>, <code>onClose</code>를 한 번에 제공한다.</li>
            <li><strong>useToast</strong> — API 에러나 성공 알림을 한 줄로 표시. 위치, 지속 시간, 상태(success/error/warning) 설정이 간편하다.</li>
            <li><strong>Image</strong> — fallback 이미지 지원이 내장되어 있어서, TMDB 포스터 이미지 로딩 실패 시 대체 이미지를 쉽게 설정했다.</li>
          </ul>
        </section>

        <section>
          <h2>Emotion과의 관계</h2>
          <p>
            Chakra UI 내부는 Emotion(CSS-in-JS 라이브러리)으로 동작한다.
            대부분의 스타일링은 Style Props로 충분하지만, 가끔 Chakra UI가 제공하지 않는
            세밀한 스타일이 필요할 때 Emotion의 <code>css</code> prop을 직접 사용할 수 있었다.
          </p>
          <p>
            이 과정에서 CSS-in-JS의 동작 원리(런타임 스타일 생성, className 해싱 등)를
            자연스럽게 이해하게 됐다.
            나중에 Tailwind CSS로 넘어갔을 때 &quot;런타임 vs 빌드타임 CSS&quot;의 차이를 체감할 수 있었던 것도
            이때 Emotion을 직접 다뤄본 덕분이다.
          </p>
        </section>

        <section>
          <h2>이후에 미친 영향</h2>
          <p>
            Chakra UI 문서를 통째로 공부한 경험은 예상보다 오래 써먹었다.
          </p>
          <ul>
            <li><strong>컴포넌트 설계 감각</strong> — &quot;이 컴포넌트에 어떤 prop이 있어야 하지?&quot;를 고민할 때 Chakra UI의 API 설계가 레퍼런스가 됐다.</li>
            <li><strong>디자인 토큰 개념</strong> — spacing, colors, typography를 토큰으로 관리하는 사고방식을 여기서 처음 접했다. 이후 Tailwind CSS의 설계 철학을 이해하는 데 직접적으로 도움이 됐다.</li>
            <li><strong>공식 문서 읽는 습관</strong> — &quot;블로그 글 검색하지 말고 공식 문서부터 읽자&quot;는 습관이 이때 잡혔다. 결국 가장 정확하고 최신인 정보는 공식 문서에 있다.</li>
            <li><strong>Compound Component 패턴</strong> — Chakra UI에서 체득한 Composition 패턴을 이후 직접 컴포넌트를 설계할 때도 적용했다.</li>
          </ul>
        </section>

        <section>
          <h2>정리하며</h2>
          <p>
            라이브러리 하나를 &quot;대충 필요한 것만 찾아 쓰기&quot;와 &quot;레퍼런스를 통째로 소화하기&quot;의 차이는
            생각보다 크다. 전자는 매번 검색에 시간을 쓰고, 후자는 머릿속에 지도가 그려져 있으니 바로 구현으로 간다.
          </p>
          <p>
            물론 모든 라이브러리를 이렇게 공부할 수는 없다. 하지만 프로젝트의 핵심 도구 하나쯤은
            공식 문서를 전부 읽어볼 가치가 있다. EUTCHA 때 Chakra UI에 투자한 시간이
            이후의 개발 생산성으로 몇 배나 돌아왔다고 확신한다.
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
