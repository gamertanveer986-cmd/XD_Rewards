import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";

/**
 * Connects the AI SDK to the Lovable AI Gateway.
 * Never expose the key to the client.
 */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}
