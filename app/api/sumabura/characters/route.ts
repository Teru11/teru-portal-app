import { ApiError, errorResponse, parseInteger, parseJsonBody, successResponse } from "../../../../lib/api-response";
import { getCharacters, updateCharacter } from "../../../../services/sumabura-service";

/** PostgreSQLドライバーを使うため、このRoute HandlerをNode.jsで実行します。 */
export const runtime = "nodejs";

/**
 * ファイター一覧取得API（GET /api/sumabura/characters）。
 * ファイター一覧を取得します。
 * nicknameは完全一致、registered_only=trueは使用登録済みだけに絞り込みます。
 * @param {Request} request クエリ文字列を含むHTTPリクエスト
 * @returns {Promise<Response>} 共通形式のファイター一覧またはエラー
 */
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

/**
 * ファイター更新API（PUT /api/sumabura/characters）。
 * ファイターの略称・説明・使用登録状態をまとめて更新します。
 * 指定された値を検証してからServiceへ渡し、DB更新結果を共通形式で返します。
 * @param {Request} request 更新対象IDと変更項目を含むJSONリクエスト
 * @returns {Promise<Response>} 更新後のファイターまたは共通形式のエラー
 */
export async function PUT(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const hasNote = Object.hasOwn(body, "note");
    const hasNickname = Object.hasOwn(body, "nickname");
    const hasRegistration = Object.hasOwn(body, "is_registered");
    if (!hasNote && !hasNickname && !hasRegistration) {
      throw new ApiError(400, "BAD_REQUEST", "更新する項目を1つ以上指定してください。");
    }

    // 本文に含まれる全項目を検証し、部分更新も1回のService呼び出しにまとめます。
    const id = parseInteger(body.id, "id");
    const update: { note?: string | null; nickname?: string; isRegistered?: boolean } = {};
    if (hasNote) {
      if (body.note !== null && typeof body.note !== "string") {
        throw new ApiError(400, "BAD_REQUEST", "noteは文字列またはnullで指定してください。");
      }
      update.note = body.note as string | null;
    }
    if (hasNickname) {
      if (typeof body.nickname !== "string" || body.nickname.trim().length < 1 || body.nickname.length > 20) {
        throw new ApiError(400, "BAD_REQUEST", "nicknameは1〜20文字で指定してください。");
      }
      update.nickname = body.nickname.trim();
    }
    if (hasRegistration) {
      if (typeof body.is_registered !== "boolean") {
        throw new ApiError(400, "BAD_REQUEST", "is_registeredはbooleanで指定してください。");
      }
      update.isRegistered = body.is_registered;
    }
    return successResponse(await updateCharacter(id, update));
  } catch (error) {
    return errorResponse(error);
  }
}