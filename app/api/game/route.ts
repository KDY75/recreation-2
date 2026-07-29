import { env } from "cloudflare:workers";

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS game_state (
    id INTEGER PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

async function ensureTable() {
  if (!env.DB) {
    throw new Error("게임 저장소를 사용할 수 없습니다.");
  }
  await env.DB.prepare(TABLE_SQL).run();
}

export async function GET() {
  try {
    await ensureTable();
    const row = await env.DB.prepare(
      "SELECT state_json AS stateJson, updated_at AS updatedAt FROM game_state WHERE id = ?",
    )
      .bind(1)
      .first<{ stateJson: string; updatedAt: string }>();

    return Response.json({
      state: row ? JSON.parse(row.stateJson) : null,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "게임을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensureTable();
    const payload = (await request.json()) as { state?: unknown };
    if (!payload.state || typeof payload.state !== "object") {
      return Response.json({ error: "저장할 게임 상태가 없습니다." }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO game_state (id, state_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         state_json = excluded.state_json,
         updated_at = excluded.updated_at`,
    )
      .bind(1, JSON.stringify(payload.state), updatedAt)
      .run();

    return Response.json({ ok: true, updatedAt });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "게임을 저장하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

