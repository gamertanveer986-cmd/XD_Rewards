import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

const COINS_PER_RUPEE = 100; // 1000 XD Coins = ₹10 INR

export default defineTool({
  name: "get_wallet_summary",
  title: "Get wallet summary",
  description:
    "Get the signed-in user's XD Coin balances, total earnings, ads watched and referral stats.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "display_name, withdrawable_balance, non_withdrawable_balance, total_earnings, weekly_earnings, ads_watched, referrals_count, referral_code",
      )
      .eq("user_id", ctx.getUserId())
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No profile found." }], isError: true };

    const summary = {
      ...data,
      withdrawable_inr: Number((data.withdrawable_balance / COINS_PER_RUPEE).toFixed(2)),
      minimum_withdrawal_inr: 50,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
