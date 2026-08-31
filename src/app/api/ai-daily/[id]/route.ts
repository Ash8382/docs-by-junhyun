import { isAdminRequest, unauthorized } from "@/lib/ai-daily/auth";
import { deleteArticle } from "@/lib/ai-daily/db";

export const runtime = "nodejs";

/** 개별 삭제. 항목마다 붙은 [삭제] 버튼이 부른다. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isAdminRequest(request)) return unauthorized();

  const { id } = await context.params;

  try {
    const deleted = await deleteArticle(id);
    return Response.json({ deleted }, { status: deleted ? 200 : 404 });
  } catch (error) {
    console.error(`[ai-daily] 삭제 실패 (${id})`, error);
    return Response.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  }
}
