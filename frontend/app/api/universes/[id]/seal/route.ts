import { NextResponse } from "next/server";
import { z } from "zod";
import { sealUniverseOnChain } from "@/lib/server/outcome-chain";
import { markUniverseComplete, resolveUniverseReference } from "@/lib/server/db/repository";

const SealBodySchema = z.object({
  storyHash: z.string().min(10),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const parsed = SealBodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const universe = resolveUniverseReference(id);
    if (!universe) {
      return NextResponse.json({ error: "Universe not found." }, { status: 404 });
    }
    if (universe.chainUniverseId === null) {
      return NextResponse.json({ error: "Universe is not published on-chain yet." }, { status: 409 });
    }

    const onChain = await sealUniverseOnChain({
      chainUniverseId: universe.chainUniverseId,
      storyHash: parsed.data.storyHash,
    });

    markUniverseComplete(universe.id, parsed.data.storyHash);

    return NextResponse.json({
      universeId: universe.id,
      chainUniverseId: universe.chainUniverseId,
      storyHash: parsed.data.storyHash,
      txHash: onChain.txHash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seal universe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
