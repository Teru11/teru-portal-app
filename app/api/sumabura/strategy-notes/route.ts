import { ApiError, errorResponse, parseInteger, parseJsonBody, successResponse } from "../../../../lib/api-response";
import { getStrategyNotes, updateStrategyNote } from "../../../../services/sumabura-service";

/** PostgreSQLドライバーを使うため、このRoute HandlerをNode.jsで実行します。 */
export const runtime = "nodejs";

/**
 * YouTubeの許可済みホストを持つURLだけを受け入れます。
 * @param {unknown} value リクエストから受け取ったURL値
 * @returns {string | null} 検証済みURL。未設定の場合はnull
 * @throws {ApiError} 型、長さ、URL形式またはホストが不正な場合
 */
function validateYoutubeUrl(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 255) {
    throw new ApiError(400, "BAD_REQUEST", "youtube_urlは255文字以内のURLまたはnullで指定してください。");
  }
  try {
    const url = new URL(value);
    /** 埋め込み/共有に利用するYouTubeのホスト名を限定します。 */
    const allowedHosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"];
    if (!(["http:", "https:"].includes(url.protocol) && allowedHosts.includes(url.hostname))) {
      throw new Error("unsupported host");
    }
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "youtube_urlにはYouTubeのURLを指定してください。");
  }
  return value;
}

/**
 * 指定した自キャラの対策メモを取得します。
 * target_nicknameがあれば対象略称で完全一致検索します。
 * @param {Request} request 自キャラIDと任意の対象略称を含むHTTPリクエスト
 * @returns {Promise<Response>} 対策メモ一覧または共通形式のエラー
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const myCharacterId = parseInteger(url.searchParams.get("my_character_id"), "my_character_id");
    const targetNickname = url.searchParams.get("target_nickname") || undefined;
    return successResponse(await getStrategyNotes(myCharacterId, targetNickname));
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * 自キャラと対策対象の既存メモを更新します。
 * URLを含む全項目を検証し、メモが存在しない場合は404を返します。
 * @param {Request} request 自キャラID、対象ID、内容、YouTube URLを含むJSONリクエスト
 * @returns {Promise<Response>} 更新後のメモまたは共通形式のエラー
 */
export async function PUT(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const myCharacterId = parseInteger(body.my_character_id, "my_character_id");
    const targetCharacterId = parseInteger(body.target_character_id, "target_character_id");
    if (typeof body.content !== "string") {
      throw new ApiError(400, "BAD_REQUEST", "contentは文字列で指定してください。");
    }
    if (!Object.hasOwn(body, "youtube_url")) {
      throw new ApiError(400, "BAD_REQUEST", "youtube_urlを指定してください。");
    }
    const youtubeUrl = validateYoutubeUrl(body.youtube_url);
    return successResponse(
      await updateStrategyNote({
        myCharacterId,
        targetCharacterId,
        content: body.content,
        youtubeUrl,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}