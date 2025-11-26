import Link from "next/link";

export default function PlaygroundPage() {
  const zones = [
    {
      id: "constellation",
      title: "Skill Constellation 🌌",
      description: "스킬들이 별처럼 연결되는 아름다운 우주를 탐험하세요.",
      href: "/playground/constellation",
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "group-hover:border-purple-500/50",
    },
    {
      id: "gravity-vortex",
      title: "Gravity Vortex 🌀",
      description: "수천 개의 입자가 만들어내는 중력의 춤을 감상하세요.",
      href: "/playground/gravity-vortex",
      color: "from-blue-500/20 to-indigo-500/20",
      borderColor: "group-hover:border-blue-500/50",
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

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
              <h3 className="text-2xl font-bold mb-2 text-foreground group-hover:text-foreground">
                {zone.title}
              </h3>
              <p className="text-muted-foreground group-hover:text-foreground/80">
                {zone.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
