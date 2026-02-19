import { NextResponse } from "next/server";
import { z } from "zod";
import { draftUniverseScenariosWithAgent } from "@/lib/server/ai/universe-agents";

const DraftRequestSchema = z.object({
  headline: z.string().min(10).max(240),
  targetCount: z.number().int().min(3).max(6).default(3),
  tone: z.string().min(3).max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = DraftRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const userAddress = request.headers.get("x-user-address") ?? "anonymous";
    const result = await draftUniverseScenariosWithAgent({
      headline: parsed.data.headline,
      targetCount: parsed.data.targetCount,
      tone: parsed.data.tone,
      createdBy: userAddress,
    });

    return NextResponse.json({
      universeDraftId: result.universeDraftId,
      scenarios: result.scenarios,
      debug: result.debug,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to draft scenarios.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
