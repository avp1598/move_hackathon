import { NextResponse } from "next/server";
import { resolveUniverseReference } from "@/lib/server/db/repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const universe = resolveUniverseReference(id);

    if (!universe) {
      return NextResponse.json({ error: "Universe not found." }, { status: 404 });
    }

    return NextResponse.json({
      universeId: universe.id,
      chainUniverseId: universe.chainUniverseId,
      status: universe.status,
      headline: universe.headline,
      finalStory: universe.finalStory,
      finalStoryHash: universe.finalStoryHash,
      updatedAt: universe.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch universe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
