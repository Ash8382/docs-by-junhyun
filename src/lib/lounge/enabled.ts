// 쉼터 공개 여부. 서버(2단계 배포)가 준비되기 전까지는 닫아 둔다.
// 켜려면 NEXT_PUBLIC_LOUNGE_ENABLED=true (로컬은 .env.local, 운영은 Vercel 환경변수).
// 빌드 시점에 인라인되므로 값을 바꾸면 다시 배포해야 반영된다.
export const LOUNGE_ENABLED = process.env.NEXT_PUBLIC_LOUNGE_ENABLED === "true";
