export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

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

export function parseInteger(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, "BAD_REQUEST", `${field}は1以上の整数で指定してください。`);
  }
  return parsed;
}

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