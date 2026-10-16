import { projects } from "@/data/projects";
import type { Repo, RepoId, ReposProject } from "@/data/projects/types";

/** 상세 패널이 있는 프로젝트. 코코아톡은 캡션만 둔다(스펙 2절 "세 막"). */
export const DETAIL_SLUGS = projects.map((project) => project.slug).filter((slug) => slug !== "kokoa-clone");

export interface JourneyTarget {
  slug: string;
  repo?: RepoId;
}

/** "#pfplay" → { slug: "pfplay" }, "#pickcare/biz" → { slug: "pickcare", repo: "biz" }. 모르는 해시는 null. */
export function parseJourneyHash(hash: string): JourneyTarget | null {
  let raw: string;
  try {
    raw = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return null;
  }
  const [slug, repo] = raw.split("/");
  if (!slug || !DETAIL_SLUGS.includes(slug)) return null;
  const project = projects.find((item) => item.slug === slug);
  const match = project?.kind === "repos" ? project.repos.find((item) => item.id === repo) : undefined;
  return match ? { slug, repo: match.id } : { slug };
}

export function journeyHash(target: JourneyTarget): string {
  return target.repo ? `#${target.slug}/${target.repo}` : `#${target.slug}`;
}

/** 상세 패널이 보여 주는 저장소: 해시의 저장소, 없으면 첫 저장소. 3D의 PiCKCARE 앞줄(holograms.ts)도 같은 판정을 쓴다 */
export function activeRepo(project: ReposProject, repoId?: RepoId): Repo {
  return project.repos.find((repo) => repo.id === repoId) ?? project.repos[0];
}
