import { ApiError, errorResponse, parseInteger, parseJsonBody, successResponse } from "../../../../lib/api-response";
import { getStrategyNotes, updateStrategyNote } from "../../../../services/sumabura-service";

export const runtime = "nodejs";

function validateYoutubeUrl(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 255) {
    throw new ApiError(400, "BAD_REQUEST", "youtube_urlは255文字以内のURLまたはnullで指定してください。");
  }
  try {
    const url = new URL(value);
    const allowedHosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"];
    if (!(["http:", "https:"].includes(url.protocol) && allowedHosts.includes(url.hostname))) {
      throw new Error("unsupported host");
    }
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "youtube_urlにはYouTubeのURLを指定してください。");
  }
  return value;
}

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