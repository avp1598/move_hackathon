import { NextResponse } from "next/server";
import { z } from "zod";
import { composeUniverseNarrativeWithAgent } from "@/lib/server/ai/universe-agents";

const BodySchema = z.object({
  universeId: z.string().optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const universeRef = parsed.data.universeId ?? id;
    const result = await composeUniverseNarrativeWithAgent({
      universeRef,
    });

    return NextResponse.json({
      universeId: result.universeId,
      story: result.story,
      storyHash: result.storyHash,
      metadata: result.metadata,
      debug: result.debug,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate narrative.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
