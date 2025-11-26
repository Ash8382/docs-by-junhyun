import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">이준현의 블로그</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/blog"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              블로그
            </Link>
            <Link
              href="/playground"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Playground
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
