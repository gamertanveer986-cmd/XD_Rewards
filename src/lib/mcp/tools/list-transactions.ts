import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_transactions",
  title: "List transactions",
  description:
    "List the signed-in user's recent XD Coin transactions (earnings, bonuses, redemptions).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("How many transactions to return."),
    transaction_type: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional filter, e.g. 'ad_reward', 'daily_bonus', 'withdrawal'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, transaction_type }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("transactions")
      .select("id, amount, transaction_type, description, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (transaction_type) query = query.eq("transaction_type", transaction_type);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { transactions: data ?? [] },
    };
  },
});
