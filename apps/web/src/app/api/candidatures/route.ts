import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  readCandidatures,
  writeCandidatures,
} from "@/server/candidatures-store";

function serializeUnknownError(e: unknown): string {
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string") {
      let s = o.message;
      if (typeof o.details === "string" && o.details) s += ` — ${o.details}`;
      if (typeof o.hint === "string" && o.hint) s += ` (${o.hint})`;
      return s;
    }
  }
  return String(e);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  try {
    const data = await readCandidatures(userId);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[GET /api/candidatures]", e);
    const dev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Lecture des données impossible",
        ...(dev ? { details: serializeUnknownError(e) } : {}),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as unknown;
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Le corps doit être un tableau JSON" },
        { status: 400 }
      );
    }
    await writeCandidatures(body, userId);
    return NextResponse.json({ ok: true, count: body.length });
  } catch (e) {
    console.error("[PUT /api/candidatures]", e);
    const dev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Écriture des données impossible",
        ...(dev ? { details: serializeUnknownError(e) } : {}),
      },
      { status: 500 }
    );
  }
}
