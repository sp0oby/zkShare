import { getAiAssistantBriefingText } from "@/lib/ai-briefing";

export async function GET() {
  const body = getAiAssistantBriefingText();

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Allow CDNs and tooling to cache; regenerate on deploy anyway.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
