import { ApiError, errorResponse, parseInteger, parseJsonBody, successResponse } from "../../../../lib/api-response";
import { getCharacters, updateCharacter } from "../../../../services/sumabura-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const nickname = url.searchParams.get("nickname") || undefined;
    const registeredOnlyValue = url.searchParams.get("registered_only") ?? "false";
    if (registeredOnlyValue !== "true" && registeredOnlyValue !== "false") {
      throw new ApiError(400, "BAD_REQUEST", "registered_onlyはtrueまたはfalseで指定してください。");
    }
    return successResponse(
      await getCharacters(nickname, registeredOnlyValue === "true"),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const hasNote = Object.hasOwn(body, "note");
    const hasNickname = Object.hasOwn(body, "nickname");
    if (hasNote === hasNickname) {
      throw new ApiError(400, "BAD_REQUEST", "noteまたはnicknameのどちらか一方を指定してください。");
    }

    const id = parseInteger(body.id, "id");
    if (hasNote) {
      if (body.note !== null && typeof body.note !== "string") {
        throw new ApiError(400, "BAD_REQUEST", "noteは文字列またはnullで指定してください。");
      }
      return successResponse(await updateCharacter(id, { note: body.note as string | null }));
    }

    if (typeof body.nickname !== "string" || body.nickname.trim().length < 1 || body.nickname.length > 20) {
      throw new ApiError(400, "BAD_REQUEST", "nicknameは1〜20文字で指定してください。");
    }
    return successResponse(await updateCharacter(id, { nickname: body.nickname.trim() }));
  } catch (error) {
    return errorResponse(error);
  }
}