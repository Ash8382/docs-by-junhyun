import Link from "next/link";
import { LOUNGE_ENABLED } from "@/lib/lounge/enabled";

/**
 * 사이트 헤더. 작은 화면에서는 메뉴 간격과 글자를 줄이고 줄바꿈하지 않는다(여정 2-4a, 스펙 4절 "사이트 공통 요소 변경").
 * 390px에서 한 줄에 다 들고, 375px 이하처럼 더 좁으면 메뉴를 옆으로 밀어 볼 수 있다(스크롤 막대는 숨긴다). 640px 이상은 예전과 같다.
 */
export function Header() {
  return (
    <header data-site-header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex min-w-0 sm:mr-4">
          <Link href="/" className="mr-3 flex shrink-0 items-center space-x-2 sm:mr-6">
            <span className="whitespace-nowrap font-bold sm:inline-block">이준현의 블로그</span>
          </Link>
          <nav className="flex min-w-0 items-center space-x-2.5 overflow-x-auto whitespace-nowrap text-[13px] font-medium [scrollbar-width:none] sm:space-x-6 sm:text-sm [&::-webkit-scrollbar]:hidden">
            <Link
              href="/blog"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              블로그
            </Link>
            <Link
              href="/about"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              소개
            </Link>
            <Link
              href="/journey"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Journey
            </Link>
            {LOUNGE_ENABLED && (
              <Link
                href="/lounge"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                쉼터
              </Link>
            )}
            <Link
              href="/ai-daily"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              AI Daily
            </Link>
            <Link
              href="https://github.com/Ash8382"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              GitHub
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
