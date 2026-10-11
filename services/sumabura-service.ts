import { ApiError } from "../lib/api-response";
import { getPool } from "../lib/db";

export type Character = {
  id: number;
  name: string;
  nickname: string;
  note: string | null;
  is_registered: boolean;
};

export type StrategyNote = {
  id: number;
  my_character_id: number;
  target_character_id: number;
  target_name: string;
  target_nickname: string;
  content: string;
  youtube_url: string | null;
  updated_at: Date;
};

export async function getCharacters(
  nickname?: string,
  registeredOnly = false,
): Promise<Character[]> {
  const result = await getPool().query<Character>(
    `SELECT c.id, c.name, c.nickname, c.note,
            EXISTS (
              SELECT 1 FROM sumabura.user_characters uc
              WHERE uc.character_id = c.id AND uc.is_deleted = FALSE
            ) AS is_registered
       FROM sumabura.characters c
      WHERE ($1::text IS NULL OR c.nickname = $1)
        AND ($2::boolean = FALSE OR EXISTS (
          SELECT 1 FROM sumabura.user_characters uc
          WHERE uc.character_id = c.id AND uc.is_deleted = FALSE
        ))
      ORDER BY c.id`,
    [nickname ?? null, registeredOnly],
  );
  return result.rows;
}

export async function updateCharacter(
  id: number,
  update: { note?: string | null; nickname?: string; isRegistered?: boolean },
) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const character = await client.query(
      "SELECT id FROM sumabura.characters WHERE id = $1",
      [id],
    );
    if (!character.rows[0]) {
      throw new ApiError(404, "NOT_FOUND", "ファイターが見つかりません。");
    }

    const assignments: string[] = [];
    const values: unknown[] = [id];
    if (update.nickname !== undefined) {
      values.push(update.nickname);
      assignments.push(`nickname = $${values.length}`);
    }
    if (update.note !== undefined) {
      values.push(update.note);
      assignments.push(`note = $${values.length}`);
    }
    if (assignments.length > 0) {
      await client.query(
        `UPDATE sumabura.characters SET ${assignments.join(", ")} WHERE id = $1`,
        values,
      );
    }

    if (update.isRegistered === true) {
      const existing = await client.query(
        `SELECT id FROM sumabura.user_characters
          WHERE character_id = $1 AND is_deleted = FALSE
          FOR UPDATE`,
        [id],
      );
      if (!existing.rows[0]) {
        await client.query(
          `INSERT INTO sumabura.user_characters (character_id, is_deleted)
           VALUES ($1, FALSE)`,
          [id],
        );
      }
      await client.query(
        `INSERT INTO sumabura.strategy_notes
           (my_character_id, target_character_id, content, youtube_url)
         SELECT $1, c.id, '', NULL
           FROM sumabura.characters c
          WHERE NOT EXISTS (
            SELECT 1 FROM sumabura.strategy_notes sn
             WHERE sn.my_character_id = $1
               AND sn.target_character_id = c.id
          )`,
        [id],
      );
    } else if (update.isRegistered === false) {
      await client.query(
        `UPDATE sumabura.user_characters SET is_deleted = TRUE
          WHERE character_id = $1 AND is_deleted = FALSE`,
        [id],
      );
    }

    const result = await client.query(
      `SELECT c.id, c.name, c.nickname, c.note,
              EXISTS (
                SELECT 1 FROM sumabura.user_characters uc
                WHERE uc.character_id = c.id AND uc.is_deleted = FALSE
              ) AS is_registered
         FROM sumabura.characters c
        WHERE c.id = $1`,
      [id],
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getStrategyNotes(
  myCharacterId: number,
  targetNickname?: string,
): Promise<StrategyNote[]> {
  const result = await getPool().query<StrategyNote>(
    `SELECT sn.id, sn.my_character_id, sn.target_character_id,
            c.name AS target_name, c.nickname AS target_nickname,
            sn.content, sn.youtube_url, sn.updated_at
       FROM sumabura.strategy_notes sn
       JOIN sumabura.characters c ON c.id = sn.target_character_id
      WHERE sn.my_character_id = $1
        AND ($2::text IS NULL OR c.nickname = $2)
      ORDER BY c.id`,
    [myCharacterId, targetNickname ?? null],
  );
  return result.rows;
}

export async function updateStrategyNote(input: {
  myCharacterId: number;
  targetCharacterId: number;
  content: string;
  youtubeUrl: string | null;
}) {
  const result = await getPool().query<StrategyNote>(
    `UPDATE sumabura.strategy_notes sn
        SET content = $3, youtube_url = $4, updated_at = CURRENT_TIMESTAMP
       FROM sumabura.characters c
      WHERE sn.my_character_id = $1
        AND sn.target_character_id = $2
        AND c.id = sn.target_character_id
      RETURNING sn.id, sn.my_character_id, sn.target_character_id,
                c.name AS target_name, c.nickname AS target_nickname,
                sn.content, sn.youtube_url, sn.updated_at`,
    [input.myCharacterId, input.targetCharacterId, input.content, input.youtubeUrl],
  );
  if (!result.rows[0]) {
    throw new ApiError(404, "NOT_FOUND", "対策メモが見つかりません。");
  }
  return result.rows[0];
}