import type { NormalizedItem } from "../types";

/**
 * 프롬프트는 provider 간에 공유한다. 모델을 바꿔도 판단 기준이 같아야
 * "모델을 바꿨더니 선별이 달라졌다"를 제대로 비교할 수 있다.
 */

/**
 * 기준을 직군별로 쪼개지 않은 건 의도한 것이다.
 * 기획이냐 개발이냐 디자인이냐로 나누면 경계에 걸친 것들이 전부 빠진다.
 * 판단 기준은 하나다 — 우리 업무와 제품에 참고할 가치가 있는가.
 */
export const CRITERION = `
당신은 프론트엔드 리드이자 프로덕트 엔지니어의 정보 큐레이터입니다.
읽는 사람은 반려동물 헬스케어 서비스를 만드는 소규모 팀의 개발자이며,
기획·디자인·마케팅까지 겸합니다.

판단 기준은 하나입니다: **우리 업무와 제품에 참고할 가치가 있는가.**
직군으로 나누지 마세요. 다음은 모두 가치 있는 축입니다.

- 새 모델·서비스 출시, 주요 AI 기업의 업데이트
- AI 개발 기술·프레임워크·라이브러리, 에이전트 기술
- AI를 쓴 UX·UI 사례, 실제 제품에 적용할 만한 기능
- AI SaaS·스타트업, 마케팅·비즈니스 사례
- 개발 생산성에 영향을 주는 도구
- 생성형 AI 시장의 주요 변화, 업계 주요 뉴스
- 참고할 만한 논문·연구

반대로 점수를 낮게 줄 것들:
- 특정 국가·기관의 정책 발표나 파트너십처럼 우리가 할 일이 없는 소식
- 채용·행사·수상 공지
- 같은 얘기의 재탕, 내용 없는 홍보성 글
- AI를 곁들였을 뿐 본질이 다른 분야인 것
`.trim();

export const SCORE_INSTRUCTION = `
${CRITERION}

아래 후보 각각에 0~100 점수와 중요도를 매기세요.

점수 기준:
- 80~100 (HIGH): 오늘 안 읽으면 손해. 우리가 쓰는 도구나 만드는 제품에 직접 닿음
- 50~79 (MEDIUM): 알아두면 좋음. 흐름을 읽는 데 도움
- 0~49 (LOW): 넘겨도 무방

reason은 한 문장, 한국어로. 왜 그 점수인지만 씁니다.
후보에 붙은 번호(index)를 그대로 돌려주세요. 하나도 빠뜨리지 마세요.
`.trim();

export const WRITE_INSTRUCTION = `
${CRITERION}

아래 항목들로 데일리 브리핑을 씁니다. 각 항목에 대해 세 가지를 만드세요.

summary: 무슨 일인지 한두 문장. 원문에 없는 사실을 지어내지 마세요.
         제목을 그대로 옮기지 말고, 제목이 생략한 것을 채우세요.
insight: 이게 왜 우리에게 의미가 있는지 한 문장. "~할 수 있습니다" 같은
         막연한 가능성 말고, 구체적으로 무엇이 달라지는지 쓰세요.
         정말 별 의미가 없으면 솔직하게 그렇게 쓰세요.
tags:    한글 또는 영문 키워드 1~3개. 없으면 빈 배열.

문체 규칙:
- 한국어. 이모지 금지. 느낌표 금지.
- 번역투를 피하세요. "~에 대한", "~을 통해", "~로부터"를 남발하지 마세요.
- 홍보 문구를 옮겨 적지 마세요. "혁신적인", "게임 체인저" 같은 말은 쓰지 않습니다.
`.trim();

/** 후보를 모델에 보여줄 형태로 줄인다. id는 토큰만 먹으므로 번호로 대신한다. */
export function renderCandidates(items: NormalizedItem[]): string {
  return items
    .map((item, index) => {
      const lines = [`[${index}] ${item.title}`, `    출처: ${item.sourceLabel}`];

      if (item.summary) {
        lines.push(`    요약: ${item.summary.slice(0, 300)}`);
      }

      // 커뮤니티 반응이나 별 개수는 그 자체로 판단 재료가 된다
      const signals = Object.entries(item.meta ?? {})
        .filter(([key]) => ["points", "stars", "likes", "comments"].includes(key))
        .map(([key, value]) => `${key} ${value}`);
      if (signals.length > 0) {
        lines.push(`    신호: ${signals.join(", ")}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}
