import { isAdminRequest, unauthorized } from "@/lib/ai-daily/auth";
import { deleteAllArticles } from "@/lib/ai-daily/db";

export const runtime = "nodejs";

/** 전체 삭제. 화면의 [전체 삭제] 버튼이 부른다. */
export async function DELETE(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const deleted = await deleteAllArticles();
    return Response.json({ deleted });
  } catch (error) {
    console.error("[ai-daily] 전체 삭제 실패", error);
    return Response.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  }
}
