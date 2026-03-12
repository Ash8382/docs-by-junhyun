import Link from "next/link";

export default function PlaygroundPage() {
  const zones = [
    {
      id: "constellation",
      title: "Skill Constellation",
      description: "스킬들이 별처럼 연결되는 아름다운 우주를 탐험하세요.",
      href: "/playground/constellation",
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "group-hover:border-purple-500/50",
      difficulty: "3D",
    },
    {
      id: "fluid-aura",
      title: "Fluid Aura",
      description: "손끝에서 피어나는 몽환적인 빛과 연기의 흐름을 느껴보세요.",
      href: "/playground/fluid-aura",
      color: "from-teal-500/20 to-emerald-500/20",
      borderColor: "group-hover:border-teal-500/50",
      difficulty: "3D",
    },
    {
      id: "music-visualizer",
      title: "Particle Music Visualizer",
      description: "음악에 반응하는 파티클이 만들어내는 몰입감 있는 시각 효과.",
      href: "/playground/music-visualizer",
      color: "from-pink-500/20 to-violet-500/20",
      borderColor: "group-hover:border-pink-500/50",
      difficulty: "3D + Audio",
    },
    {
      id: "card-flip",
      title: "3D Card Flip Gallery",
      description: "클릭하면 3D로 뒤집히며 상세 정보를 보여주는 카드 갤러리.",
      href: "/playground/card-flip",
      color: "from-rose-500/20 to-pink-500/20",
      borderColor: "group-hover:border-rose-500/50",
      difficulty: "CSS 3D",
    },
    {
      id: "color-palette",
      title: "Color Palette Generator",
      description: "HSL 슬라이더로 색상을 조합하고 조화로운 팔레트를 만들어보세요.",
      href: "/playground/color-palette",
      color: "from-red-500/20 to-rose-500/20",
      borderColor: "group-hover:border-red-500/50",
      difficulty: "Tool",
    },
  ];

  return (
    <div className="container py-20 lg:py-32">
      <div className="mx-auto max-w-2xl text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl mb-4 text-foreground">
          Playground
        </h1>
        <p className="text-xl text-muted-foreground">
          다양한 인터랙티브 경험을 통해 기술과 재미를 탐험해보세요.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <Link
            key={zone.id}
            href={zone.href}
            className={`group relative overflow-hidden rounded-xl border border-border bg-background/50 p-6 transition-all hover:shadow-2xl hover:-translate-y-1 ${zone.borderColor}`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${zone.color} opacity-0 transition-opacity group-hover:opacity-100`}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-foreground group-hover:text-foreground">
                  {zone.title}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {zone.difficulty}
                </span>
              </div>
              <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                {zone.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
