
# XD Rewards — Premium Fintech Redesign Plan

A focused, multi-phase redesign covering global theming, onboarding, navigation, and 14 specific screens/flows. Several items mix pure UI with business logic (referral commission, leaderboard resets, smart-email gating) — those will need a small DB migration.

Before I start, two quick confirmations so I build the right thing.

## Questions before build

1. **Referral commission scaling (item 12):** The base 10–20% scaling up to 50% — is this commission on the referred user's *withdrawals* (recurring %) or on their *earnings*? Confirmed tiers I'll use unless you say otherwise: 10% (1–9 refs), 20% (10–99), 35% (100–999), 50% (1000+).
2. **Smart email (item 7):** Today email is collected at signup (required for auth). You want signup to become "username/phone only" and email only requested at the ₹10 threshold? Or keep email at signup but **hide/skip the email verification step** until threshold? The second is far safer — confirm which.
3. **Language switcher (item 8):** Which languages? (e.g. English + Hindi only, or full i18n scaffold?)
4. **Existing data:** OK to wipe current leaderboard scores on first Monday reset, and reset referral counters at next daily reset?

## Phase 1 — Global Theme & Shell

- Rewrite `src/index.css` tokens: pure dark `#121212` background, surface `#1A1A1A`, border `#2A2A2A`, single accent **Deep Crimson `#D32F2F`** (+ crimson-glow). Success green `#1DB954`. Remove purple/amber "trust-gradient" utilities.
- Swap font to **Inter** (already Google-friendly), drop Outfit.
- `AppHeader.tsx`: centered "XD Rewards" wordmark, settings icon left, notification bell right. Remove hamburger.
- `BottomNav.tsx`: restyle for crimson active state, flat icons (no gradients).
- `SplashScreen.tsx`: minimalist crimson monogram + "XD REWARDS" wordmark + thin progress bar. After 8s of hang, surface a **Support** button (mailto + WhatsApp).

## Phase 2 — Auth & Onboarding

- `Auth.tsx`: strip marketing chips ("10, 5, 10"), single card titled **"Welcome Back"** / "Create Account" toggle, email + password only.
- New `TermsAgreementGate.tsx`: full-screen modal on first launch (localStorage flag `xd_terms_accepted_v1`). Scrollable T&C, "I Agree & Continue" enabled only after scrolling to bottom.
- Mount the gate inside `App.tsx` before routes render.

## Phase 3 — Settings (new home for legal)

- New page `src/pages/Settings.tsx` with sections:
  - Language Switcher (react-i18next light scaffold — see Q3)
  - Sound Toggle (localStorage `xd_sound_enabled`)
  - Help & Support → links to `/support`
  - Privacy & Policy → expandable in-page (Terms, Privacy, Refund, Disclaimer)
  - Crimson outline **Log Out** button at bottom
- Remove disclaimer/policy banners from `Dashboard.tsx`, `Profile.tsx`, `Leaderboard.tsx`, `HamburgerMenu.tsx`. Delete `Disclaimer.tsx` usages from non-Settings pages.

## Phase 4 — Redeem, Wallet & Smart Email

- `Wallet.tsx` / `GiftCards.tsx`: premium dark cards, crimson CTA, brand logo, payout value in ₹ INR. Strip all "no guarantee"/warning copy.
- `SmartEmailDialog.tsx` (new): triggered when balance ≥ 1000 coins and `user_profiles.payout_email` is null. Blocks the redeem CTA until provided + verified via OTP email link.

## Phase 5 — Profile & Achievements

- `Profile.tsx`: tight list (Avatar, name, level, UPI status, joined date). Remove legal text.
- `UserBadges.tsx`: gallery grid — unlocked badges get crimson glow ring + color icon; locked are greyscale + lock overlay.

## Phase 6 — Ranking & Referral

- `Leaderboard.tsx`: top-3 **podium** UI (2-1-3 layout, crowns, crimson glow on #1). List below from rank 4.
- DB: add `leaderboard_period_start` logic — weekly reset Mondays 00:00 IST via a `current_week_start()` SQL helper; queries filter `created_at >= current_week_start()`.
- `Referral.tsx`: daily-reset leaderboard (same pattern, daily). Show commission tier card.
- New trigger: on successful withdrawal, if it's the referred user's **first** approved withdrawal, credit referrer 500 coins + recurring tier % to `transactions`.
- Add `referral_payouts` table tracking first-withdrawal bonus to prevent double-credit.

## Phase 7 — Withdraw Proof & Support

- `WithdrawProof.tsx`: minimalist card list — green check icon, masked UPI, amount, date, txn id. No celebratory emojis.
- `Support.tsx`: clean "Send Feedback" form (subject, message, optional screenshot). Strip every `[APP URL]` / placeholder. Single contact card (email + WhatsApp).

## Technical notes

- **Migration:** weekly/daily reset helper functions, `referral_payouts` table (referrer_id, referred_id, bonus_coins, commission_pct, withdrawal_id, created_at) with RLS, trigger on `gift_card_purchases`/withdrawal table for first-payout bonus.
- **i18n:** install `react-i18next` + `i18next` with namespaces `common`, `settings`. Lazy-load locales.
- **Tokens:** all colors via CSS vars in `index.css`; no hex in components.
- **Files touched (≈):** `index.css`, `tailwind.config.ts`, `App.tsx`, `AppHeader.tsx`, `BottomNav.tsx`, `SplashScreen.tsx`, `Auth.tsx`, `Dashboard.tsx`, `Wallet.tsx`, `GiftCards.tsx`, `Profile.tsx`, `UserBadges.tsx`, `Leaderboard.tsx`, `Referral.tsx`, `WithdrawProof.tsx`, `Support.tsx`, plus new `Settings.tsx`, `TermsAgreementGate.tsx`, `SmartEmailDialog.tsx`, and one migration.

Reply with answers to the 4 questions (or "go ahead with defaults") and I'll execute phase by phase.
