import { NextResponse } from "next/server";
import {
  readCandidatures,
  writeCandidatures,
} from "@/server/candidatures-store";

export async function GET() {
  try {
    const data = await readCandidatures();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Lecture des données impossible" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Le corps doit être un tableau JSON" },
        { status: 400 }
      );
    }
    await writeCandidatures(body);
    return NextResponse.json({ ok: true, count: body.length });
  } catch {
    return NextResponse.json(
      { error: "Écriture des données impossible" },
      { status: 500 }
    );
  }
}
