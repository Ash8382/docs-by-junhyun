import Link from "next/link";

export const metadata = {
  title: "Web3, NFT, i18n 개념 정리 - PFPlay 프로젝트 사전 학습 - 이준현",
  description: "PFPlay 합류 전 Web3 생태계, NFT(PFP) 개념, 다국어 지원(i18n) 구현 방법 학습 기록.",
};

export default function Web3I18nNftPage() {
  return (
    <article className="container py-10 lg:py-16 max-w-3xl mx-auto">
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>2024.07.20</span>
          <span>&middot;</span>
          <span>글</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          Web3, NFT, i18n 개념 정리 - PFPlay 프로젝트 사전 학습
        </h1>
        <div className="flex flex-wrap gap-2">
          {["Web3", "NFT", "i18n"].map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-8">
        <figure className="my-8">
          <img
            src="/posts/web3-concept.jpg"
            alt="Web3 개념도"
            className="rounded-lg w-full"
          />
          <figcaption className="text-center text-sm text-muted-foreground mt-2">Web3 생태계 개요</figcaption>
        </figure>

        <p>
          PFPlay 프로젝트에 합류하기 전, 생소한 도메인이라 사전 학습이 필요했다.
          Web3 생태계, PFP NFT 개념, 그리고 글로벌 서비스를 위한 i18n(국제화) 구현 방법을 정리한다.
        </p>

        <section>
          <h2>Web3란?</h2>
          <p>
            Web3는 블록체인 기술을 기반으로 한 탈중앙화된 인터넷을 말한다.
            Web1(읽기 전용) → Web2(읽기+쓰기, 플랫폼 중심) → Web3(읽기+쓰기+소유)로 진화한 개념이다.
          </p>
          <ul>
            <li><strong>탈중앙화</strong>: 중앙 서버 없이 블록체인 네트워크에서 데이터를 관리</li>
            <li><strong>토큰 경제</strong>: 암호화폐와 토큰으로 가치를 교환</li>
            <li><strong>지갑 연결</strong>: 로그인 대신 MetaMask 같은 지갑으로 인증</li>
          </ul>
          <p>
            프론트엔드 관점에서는 지갑 연결(wallet connect), 트랜잭션 서명, 스마트 컨트랙트 호출 등
            기존 Web2와는 다른 인터랙션 패턴을 알아야 했다.
          </p>
        </section>

        <section>
          <h2>NFT와 PFP</h2>
          <p>
            NFT(Non-Fungible Token)는 대체 불가능한 디지털 자산을 의미한다.
            그중 <strong>PFP(Profile Picture) NFT</strong>는 프로필 이미지로 사용하는 NFT를 말한다.
            BAYC(Bored Ape Yacht Club), CryptoPunks 같은 프로젝트가 대표적이다.
          </p>
          <p>
            PFPlay에서는 사용자가 자신의 PFP NFT를 프로필로 설정하고,
            이를 통해 아이덴티티를 표현하는 소셜 기능을 구현해야 했다.
            NFT 메타데이터 조회, 이미지 렌더링, 소유권 검증 등의 프론트엔드 작업이 필요했다.
          </p>
        </section>

        <section>
          <h2>i18n (국제화)</h2>
          <p>
            PFPlay는 글로벌 사용자를 대상으로 하기 때문에 다국어 지원이 필수였다.
            Next.js에서 i18n을 구현하는 방법을 학습했다.
          </p>
          <ul>
            <li><strong>next-intl</strong> 또는 <strong>next-i18next</strong> 라이브러리 활용</li>
            <li>언어별 JSON 파일로 번역 문자열 관리</li>
            <li>URL 경로 기반 로케일 라우팅 (<code>/en/</code>, <code>/ko/</code>)</li>
            <li>날짜, 숫자 포맷의 로케일별 처리</li>
          </ul>
          <p>
            단순 번역뿐 아니라 RTL(Right-to-Left) 지원, 복수형 처리, 컨텍스트에 따른 번역 분기 등
            생각보다 고려할 부분이 많았다.
          </p>
        </section>

        <section>
          <h2>정리하며</h2>
          <p>
            Web3 도메인은 기존 웹 개발과 꽤 다른 개념들이 많아서 사전 학습에 시간을 투자한 게 좋았다.
            특히 지갑 인증 플로우와 NFT 메타데이터 구조를 미리 이해해두니
            실제 프로젝트 합류 후 적응이 훨씬 빨랐다.
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
