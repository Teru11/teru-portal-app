import { ApiError, errorResponse, parseInteger, parseJsonBody, successResponse } from "../../../../lib/api-response";
import { createUserCharacter, deleteUserCharacter } from "../../../../services/sumabura-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const characterId = parseInteger(body.character_id, "character_id");
    return successResponse(await createUserCharacter(characterId), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idValue = url.searchParams.get("id");
    const characterIdValue = url.searchParams.get("character_id");
    const hasId = url.searchParams.has("id");
    const hasCharacterId = url.searchParams.has("character_id");
    if (hasId === hasCharacterId) {
      throw new ApiError(400, "BAD_REQUEST", "idまたはcharacter_idのどちらか一方を指定してください。");
    }
    const key = idValue
      ? { id: parseInteger(idValue, "id") }
      : { character_id: parseInteger(characterIdValue, "character_id") };
    return successResponse(await deleteUserCharacter(key));
  } catch (error) {
    return errorResponse(error);
  }
}