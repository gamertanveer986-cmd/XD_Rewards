import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const COINS_PER_RUPEE = 100; // 1000 XD Coins = ₹10 INR

/** Rewards are processed within 48 hours after manual verification. */
const PAYOUT_WINDOW_HOURS = 48;

function estimatePayout(status: string, createdAt: string, processedAt: string | null) {
  if (status === "completed") {
    return { estimated_payout: null, note: processedAt ? `Paid on ${processedAt}` : "Paid" };
  }
  if (status === "rejected" || status === "cancelled") {
    return { estimated_payout: null, note: "Request was not approved" };
  }
  const eta = new Date(new Date(createdAt).getTime() + PAYOUT_WINDOW_HOURS * 3600_000);
  const overdue = eta.getTime() < Date.now();
  return {
    estimated_payout: eta.toISOString(),
    note: overdue
      ? "Under manual verification — slightly past the usual 48 hour window"
      : "Processed within 48 hours after manual verification",
  };
}

export default defineTool({
  name: "list_withdrawals",
  title: "List withdrawal requests",
  description:
    "List the signed-in user's latest withdrawal / redemption requests with their status and estimated payout time.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("How many requests to return."),
    status: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional status filter, e.g. 'pending' or 'completed'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("gift_card_purchases")
      .select(
        "id, amount_paid, status, created_at, processed_at, email, product:gift_card_products(name, brand, denomination)",
      )
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const withdrawals = (data ?? []).map((row: any) => {
      const timing = estimatePayout(row.status, row.created_at, row.processed_at);
      return {
        id: row.id,
        reward: row.product?.name ?? "Reward",
        brand: row.product?.brand ?? null,
        amount_inr: Number(row.amount_paid),
        amount_xd_coins: Math.round(Number(row.amount_paid) * COINS_PER_RUPEE),
        status: row.status,
        requested_at: row.created_at,
        processed_at: row.processed_at,
        payout_email: row.email ?? null,
        ...timing,
      };
    });

    const summary =
      withdrawals.length === 0
        ? "No withdrawal requests found."
        : withdrawals
            .map(
              (w) =>
                `${w.reward} — ₹${w.amount_inr} (${w.amount_xd_coins} XD Coins) · ${w.status} · requested ${w.requested_at}` +
                (w.estimated_payout ? ` · estimated payout by ${w.estimated_payout}` : "") +
                ` · ${w.note}`,
            )
            .join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { withdrawals, minimum_withdrawal_inr: 50, payout_window_hours: PAYOUT_WINDOW_HOURS },
    };
  },
});
