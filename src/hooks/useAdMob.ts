import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  initializeAdMob,
  prepareRewardedAd,
  showRewardedAd,
  setupAdListeners,
} from '@/lib/admob';

export function useAdMob() {
  const [isAdReady, setIsAdReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const rewardEarnedRef = useRef<{ type: string; amount: number } | null>(null);
  const initializedRef = useRef(false);

  const loadRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    console.log('[useAdMob] loadRewardedAd called');
    setIsLoading(true);
    try {
      await prepareRewardedAd();
      // prepareRewardVideoAd resolves when ad is loaded
      setIsAdReady(true);
      setIsLoading(false);
      console.log('[useAdMob] ✅ Ad ready to show');
      return true;
    } catch (err: any) {
      console.error('[useAdMob] ❌ Failed to load ad:', err);
      setIsAdReady(false);
      setIsLoading(false);
      setInitError(err?.message || 'Failed to load ad');
      return false;
    }
  }, []);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const native = platform === 'android' || platform === 'ios';
    setIsNative(native);

    if (!native) {
      console.log('[useAdMob] Web platform — ads will be simulated');
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    (async () => {
      console.log('[useAdMob] Starting AdMob init on native platform:', platform);
      const ok = await initializeAdMob();
      if (!ok) {
        if (mounted) setInitError('AdMob failed to initialize. Check config.');
        return;
      }

      // Attach listeners once. The reward listener captures the reward as backup.
      setupAdListeners({
        onRewardEarned: (reward) => {
          rewardEarnedRef.current = { type: reward.type, amount: reward.amount };
        },
        onAdDismissed: () => {
          if (mounted) {
            setIsAdReady(false);
            // Auto-prepare next ad
            loadRewardedAd();
          }
        },
        // We rely on prepareRewardedAd's promise instead of Loaded/FailedToLoad events
        // for state — events still fire and log for debugging.
      });

      // Pre-load the first ad
      await loadRewardedAd();
    })();

    return () => {
      mounted = false;
    };
  }, [loadRewardedAd]);

  const watchAd = useCallback(async (): Promise<{ success: boolean; reward?: { type: string; amount: number }; error?: string }> => {
    // STRICT: Ads only work on native platforms. NO simulation, NO fake rewards.
    if (!isNative) {
      console.warn('[useAdMob] ❌ Cannot show ad — not on native platform');
      return { success: false, error: 'Ads only work in the mobile app.' };
    }

    if (!isAdReady) {
      console.warn('[useAdMob] ❌ Ad not ready — refusing to show');
      return { success: false, error: 'Ad not ready. Please wait and try again.' };
    }

    rewardEarnedRef.current = null;
    console.log('[useAdMob] 🎬 Calling showRewardedAd — waiting for real Rewarded event');

    try {
      const reward = await showRewardedAd();
      // Only grant if we got a real reward from AdMob (either from promise or listener)
      if (reward && reward.amount > 0) {
        console.log('[useAdMob] ✅ Real reward from showRewardedAd promise:', reward);
        return { success: true, reward: { type: reward.type, amount: reward.amount } };
      }
      if (rewardEarnedRef.current) {
        console.log('[useAdMob] ✅ Real reward from listener:', rewardEarnedRef.current);
        return { success: true, reward: rewardEarnedRef.current };
      }
      console.warn('[useAdMob] ❌ Ad closed without reward event — NO reward granted');
      return { success: false, error: 'Ad was closed before completion. No reward given.' };
    } catch (err: any) {
      console.error('[useAdMob] ❌ showRewardedAd error:', err);
      return { success: false, error: err?.message || 'Failed to show ad.' };
    }
  }, [isNative, isAdReady]);

  return {
    isAdReady,
    isLoading,
    isNative,
    initError,
    watchAd,
    loadRewardedAd,
  };
}
