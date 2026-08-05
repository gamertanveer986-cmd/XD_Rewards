import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getWalletSummary from "./tools/get-wallet-summary";
import listTransactions from "./tools/list-transactions";
import listAchievements from "./tools/list-achievements";
import getLeaderboard from "./tools/get-leaderboard";
import listWithdrawals from "./tools/list-withdrawals";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "xd-rewards-back",
  title: "XD Rewards back 🏆",
  version: "0.1.0",
  instructions:
    "Tools for XD Rewards, an entertainment rewards platform where users earn XD Coins (1000 XD Coins = ₹10 INR). Use `get_wallet_summary` for balances, `list_transactions` for earning history, `list_withdrawals` for withdrawal/redemption requests with status and estimated payout time, `list_achievements` for unlocked badges and `get_leaderboard` for the weekly ranking. All tools act as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getWalletSummary, listTransactions, listWithdrawals, listAchievements, getLeaderboard],
});
