import Link from "next/link";
import { LOUNGE_ENABLED } from "@/lib/lounge/enabled";

/**
 * 사이트 헤더. 작은 화면에서는 메뉴 간격과 글자를 줄이고 줄바꿈하지 않는다(여정 2-4a, 스펙 4절 "사이트 공통 요소 변경").
 * 390px 미만에서는 GitHub 글자 대신 아이콘을 보여 360·375px에서도 한 줄에 다 든다(링크 이름은 "GitHub", 2-4c). 320px처럼 더 좁으면 메뉴를
 * 옆으로 밀어 볼 수 있다(스크롤 막대는 숨긴다). 넘치는 메뉴가 포커스 테두리를 자르지 않게 메뉴 둘레에 4px 여유를 두고(p-1) 바깥 여백으로
 * 자리를 되돌린다(-m-1). 640px 이상은 예전과 같다.
 */
export function Header() {
  return (
    <header data-site-header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex min-w-0 sm:mr-4">
          <Link href="/" className="mr-3 flex shrink-0 items-center space-x-2 sm:mr-6">
            <span className="whitespace-nowrap font-bold sm:inline-block">이준현의 블로그</span>
          </Link>
          <nav className="-m-1 flex min-w-0 items-center space-x-2.5 overflow-x-auto whitespace-nowrap p-1 text-[13px] font-medium [scrollbar-width:none] sm:space-x-6 sm:text-sm [&::-webkit-scrollbar]:hidden">
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
              <span className="max-[390px]:sr-only">GitHub</span>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="hidden size-4 fill-current max-[390px]:block">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
