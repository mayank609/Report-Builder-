import { NextRequest, NextResponse } from "next/server";

import { generateTemplateSuggestion, resolveApiKey } from "@/lib/ai/gemini";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const prompt: string | undefined = body?.prompt;

  if (!prompt || prompt.trim().length < 8) {
    return NextResponse.json(
      { error: "Please provide a more detailed prompt (at least 8 characters)." },
      { status: 400 }
    );
  }

  const headerKey = request.headers.get("x-gemini-api-key");
  const apiKey = resolveApiKey(headerKey);

  try {
    const suggestion = await generateTemplateSuggestion(prompt.trim(), apiKey);
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("generate-template error", error);
    return NextResponse.json(
      { error: "Failed to generate template. Please try again." },
      { status: 500 }
    );
  }
}
