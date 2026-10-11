import type { PoolClient } from "pg";
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

/**
 * ファイターマスターをID順で取得し、各キャラの有効な使用登録状態を付与します。
 * 略称は完全一致で検索し、registeredOnlyがtrueなら登録済みだけを返します。
 * @param {string} [nickname] 完全一致で検索するファイター略称
 * @param {boolean} [registeredOnly=false] trueの場合は使用キャラ登録済みに限定
 * @returns {Promise<Character[]>} ファイターと使用状態の一覧
 */
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

/**
 * 手動投入後に遅れているSERIALシーケンスをテーブルの最大IDまで進めます。
 * 排他ロック中に確認することで、同期と同時に別の登録処理が走るのを防ぎます。
 * @param {PoolClient} client 実行中のDBトランザクション
 * @param {"user_characters" | "strategy_notes"} tableName 同期対象のテーブル名
 * @returns {Promise<void>}
 */
async function synchronizeSerialSequence(
  client: PoolClient,
  tableName: "user_characters" | "strategy_notes",
): Promise<void> {
  const qualifiedTable = `sumabura.${tableName}`;
  const qualifiedSequence = `sumabura.${tableName}_id_seq`;
  await client.query(`LOCK TABLE ${qualifiedTable} IN EXCLUSIVE MODE`);
  const state = await client.query<{ max_id: number | null; last_value: number }>(
    `SELECT (SELECT MAX(id)::integer FROM ${qualifiedTable}) AS max_id,
            last_value::integer
       FROM ${qualifiedSequence}`,
  );
  const { max_id: maxId, last_value: lastValue } = state.rows[0];
  if (maxId !== null && maxId > lastValue) {
    await client.query(
      "SELECT setval(pg_get_serial_sequence($1, 'id'), $2, TRUE)",
      [qualifiedTable, maxId],
    );
  }
}

/**
 * ファイター情報と使用キャラ登録状態を1つのトランザクションで更新します。
 * 使用登録時は既存行を再有効化し、行がない場合だけ新規作成します。
 * 不足する対策メモだけを初期化し、登録解除は論理削除として扱います。
 * @param {number} id 更新対象のファイターID
 * @param {{ note?: string | null; nickname?: string; isRegistered?: boolean }} update 変更する項目
 * @returns {Promise<Character>} 更新後のファイター情報と使用登録状態
 * @throws {ApiError} ファイターIDが存在しない場合
 */
export async function updateCharacter(
  id: number,
  update: { note?: string | null; nickname?: string; isRegistered?: boolean },
) {
  const client = await getPool().connect();
  try {
    // マスター情報と登録状態、初期メモを一括で確定または取消できるようにします。
    await client.query("BEGIN");
    const character = await client.query(
      "SELECT id FROM sumabura.characters WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (!character.rows[0]) {
      throw new ApiError(404, "NOT_FOUND", "ファイターが見つかりません。");
    }

    // 値はプレースホルダーに渡し、指定された列だけを更新します。
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
      // 使用登録済みの行を優先して取得し、再登録時はその行を再利用します。
      const registration = await client.query<{ id: number; is_deleted: boolean | null }>(
        `SELECT id, is_deleted FROM sumabura.user_characters
          WHERE character_id = $1
          ORDER BY is_deleted ASC, id DESC
          LIMIT 1
          FOR UPDATE`,
        [id],
      );
      if (registration.rows[0] && registration.rows[0].is_deleted !== false) {
        await client.query(
          "UPDATE sumabura.user_characters SET is_deleted = FALSE WHERE id = $1",
          [registration.rows[0].id],
        );
      } else if (!registration.rows[0]) {
        await synchronizeSerialSequence(client, "user_characters");
        await client.query(
          `INSERT INTO sumabura.user_characters (character_id, is_deleted)
           VALUES ($1, FALSE)`,
          [id],
        );
      }
      // 既存内容を保護しつつ、未作成の対策メモだけを追加します。
      await synchronizeSerialSequence(client, "strategy_notes");
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
      // 登録行と対策メモは物理削除せず、該当する有効行だけを論理削除します。
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
    // 更新後の登録状態まで取得してから、トランザクションを確定します。
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    // 途中で失敗した場合、同じ処理内で行った変更をすべて取り消します。
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 指定した自キャラの対策メモを対象ファイターID順で取得します。
 * 対象略称を受け取った場合は完全一致で絞り込み、未入力メモも含めて返します。
 * @param {number} myCharacterId 使用中の自キャラID
 * @param {string} [targetNickname] 完全一致で絞り込む対象ファイター略称
 * @returns {Promise<StrategyNote[]>} 対策内容と対象ファイター情報の一覧
 */
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

/**
 * 自キャラと対策対象の組み合わせに紐づくメモを更新します。
 * 内容やURLが空/NULLの場合もその値で上書きし、更新日時を現在時刻にします。
 * @param {{ myCharacterId: number; targetCharacterId: number; content: string; youtubeUrl: string | null }} input 更新項目
 * @returns {Promise<StrategyNote>} 対象ファイター情報を含む更新後のメモ
 * @throws {ApiError} 該当する組み合わせのメモがない場合
 */
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