import { NextResponse } from "next/server";
import { z } from "zod";
import { addScenarioOnChain, createUniverseOnChain } from "@/lib/server/outcome-chain";
import {
  createUniverseDraft,
  getUniverseById,
  getUniverseWithScenarios,
  linkScenarioToChain,
  markUniversePublished,
  replaceDraftScenarios,
  type ScenarioDraftInput,
  updateUniverseHeadline,
} from "@/lib/server/db/repository";

const PublishScenarioSchema = z.object({
  question: z.string().min(12).max(220),
  options: z.array(z.string().min(3).max(180)).length(4),
});

const PublishRequestSchema = z.object({
  headline: z.string().min(10).max(240),
  universeDraftId: z.string().uuid().optional(),
  scenarios: z.array(PublishScenarioSchema).min(1).max(10),
});

function toDraftInputs(
  scenarios: z.infer<typeof PublishScenarioSchema>[]
): ScenarioDraftInput[] {
  return scenarios.map((scenario) => ({
    question: scenario.question.trim(),
    options: scenario.options.map((option) => option.trim()),
    rationale: "Published scenario.",
  }));
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = PublishRequestSchema.safeParse(payload);

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
    const { headline, scenarios, universeDraftId } = parsed.data;

    const localUniverse =
      universeDraftId !== undefined
        ? getUniverseById(universeDraftId)
        : createUniverseDraft({ headline, createdBy: userAddress });

    if (!localUniverse) {
      return NextResponse.json({ error: "Universe draft was not found." }, { status: 404 });
    }

    updateUniverseHeadline(localUniverse.id, headline.trim());
    replaceDraftScenarios(localUniverse.id, toDraftInputs(scenarios));

    const chainUniverse = await createUniverseOnChain(headline.trim());
    const universeAfterChainLink = markUniversePublished({
      universeId: localUniverse.id,
      chainUniverseId: chainUniverse.chainUniverseId,
    });

    const draftWithScenarios = getUniverseWithScenarios(universeAfterChainLink.id);
    if (!draftWithScenarios) {
      throw new Error("Universe could not be loaded after publish.");
    }

    if (draftWithScenarios.scenarios.length !== scenarios.length) {
      throw new Error("Scenario persistence mismatch before publish.");
    }

    const scenarioTxs: Array<{ txHash: string; chainScenarioId: number }> = [];
    for (const draftScenario of draftWithScenarios.scenarios) {
      if (draftScenario.options.length !== 4) {
        throw new Error(`Scenario ${draftScenario.id} does not have exactly four options.`);
      }

      const onChain = await addScenarioOnChain(chainUniverse.chainUniverseId, {
        question: draftScenario.question,
        options: [
          draftScenario.options[0],
          draftScenario.options[1],
          draftScenario.options[2],
          draftScenario.options[3],
        ],
      });

      linkScenarioToChain({
        scenarioId: draftScenario.id,
        chainScenarioId: onChain.chainScenarioId,
      });

      scenarioTxs.push(onChain);
    }

    const published = getUniverseWithScenarios(localUniverse.id);
    return NextResponse.json({
      universeId: localUniverse.id,
      chainUniverseId: chainUniverse.chainUniverseId,
      headline: published?.headline ?? headline.trim(),
      scenarios: published?.scenarios ?? [],
      txHashes: {
        createUniverse: chainUniverse.txHash,
        addScenario: scenarioTxs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish universe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
