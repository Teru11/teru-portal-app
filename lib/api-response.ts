/**
 * HTTPステータスとAPIエラーコードを保持し、共通形式のエラー応答に使います。
 */
export class ApiError extends Error {
  /**
   * APIエラーを生成します。
   * @param {number} status クライアントへ返すHTTPステータス
   * @param {string} code クライアントへ返す識別用エラーコード
   * @param {string} message 画面に表示する説明文
   */
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 成功データをAPI標準の `{ success, data }` 形式へ包みます。
 * @template T dataの型
 * @param {T} data クライアントへ返すデータ
 * @param {number} [status=200] 成功時のHTTPステータス
 * @returns {Response} JSON形式の成功レスポンス
 */
export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

/**
 * 既知のAPIエラーは指定された状態とメッセージで返します。
 * 未知の例外はサーバーログへ記録し、内部情報を隠した500応答に変換します。
 * @param {unknown} error API処理中に発生した例外
 * @returns {Response} API標準のJSONエラーレスポンス
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      {
        success: false,
        error: { code: error.code, message: error.message },
      },
      { status: error.status },
    );
  }

  console.error("Sumabura API error:", error);
  return Response.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "データの処理に失敗しました。DB接続設定を確認してください。",
      },
    },
    { status: 500 },
  );
}

/**
 * 値を正の整数IDへ変換し、形式が違う場合は400エラーにします。
 * @param {unknown} value クエリまたはJSON本文の値
 * @param {string} field エラー文に表示する項目名
 * @returns {number} 検証済みの正の整数
 * @throws {ApiError} 整数でない、または1未満の場合
 */
export function parseInteger(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, "BAD_REQUEST", `${field}は1以上の整数で指定してください。`);
  }
  return parsed;
}

/**
 * リクエスト本文をJSONオブジェクトとして読み込みます。
 * 配列、null、JSONとして読めない本文は共通の400エラーに変換します。
 * @param {Request} request JSON本文を持つHTTPリクエスト
 * @returns {Promise<Record<string, unknown>>} 検証前のJSONオブジェクト
 * @throws {ApiError} 本文がJSONオブジェクトでない場合
 */
export async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("invalid body");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "リクエスト形式が正しくありません。");
  }
}