import { GROQ_JSON_SYSTEM_ADDON } from "@/lib/groq-prompt-defaults";
import { getJobtrackClerkUserId } from "@/server/jobtrack-auth";
import { NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(req: Request) {
  const userId = await getJobtrackClerkUserId();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY manquant — ajoute ta clé Groq dans .env.local (console.groq.com).",
      },
      { status: 501 }
    );
  }

  let body: {
    systemPrompt?: string;
    userContent?: string;
    model?: string;
    temperature?: number;
    max_completion_tokens?: number;
    outputFormat?: "text" | "json_rows";
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const systemPrompt = String(body.systemPrompt ?? "").trim();
  const userContent = String(body.userContent ?? "").trim();
  if (!systemPrompt || !userContent) {
    return NextResponse.json(
      { error: "systemPrompt et userContent requis." },
      { status: 400 }
    );
  }

  const outputFormat = body.outputFormat === "json_rows" ? "json_rows" : "text";

  const model = String(body.model ?? "llama-3.3-70b-versatile").trim();
  const temperature =
    typeof body.temperature === "number" && !Number.isNaN(body.temperature)
      ? Math.min(2, Math.max(0, body.temperature))
      : outputFormat === "json_rows"
        ? 0.15
        : 0.2;
  const max_completion_tokens =
    typeof body.max_completion_tokens === "number" &&
    body.max_completion_tokens > 0
      ? Math.min(8192, body.max_completion_tokens)
      : 1536;

  const systemContent =
    outputFormat === "json_rows"
      ? `${GROQ_JSON_SYSTEM_ADDON}\n\n---\nRègles métier complémentaires :\n${systemPrompt}`
      : systemPrompt;

  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ],
    temperature,
    max_completion_tokens,
  };

  if (outputFormat === "json_rows") {
    payload.response_format = { type: "json_object" };
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!res.ok) {
    const msg = data.error?.message ?? `Groq HTTP ${res.status}`;
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const text = data.choices?.[0]?.message?.content ?? "";

  if (outputFormat === "json_rows") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return NextResponse.json(
        { error: "Réponse JSON invalide du modèle.", raw: text },
        { status: 422 }
      );
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("rows" in parsed) ||
      !Array.isArray((parsed as { rows: unknown }).rows)
    ) {
      return NextResponse.json(
        { error: 'JSON attendu : { "rows": [ {...}, ... ] }', raw: text },
        { status: 422 }
      );
    }
    const rows = (parsed as { rows: unknown[] }).rows;
    return NextResponse.json({ rows, text });
  }

  return NextResponse.json({ text });
}
