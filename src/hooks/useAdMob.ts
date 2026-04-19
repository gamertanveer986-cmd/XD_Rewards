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
    if (!isNative) {
      // Web simulation for testing
      console.log('[useAdMob] Web simulation: granting reward after 3s');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, reward: { type: 'coins', amount: 1 } });
        }, 3000);
      });
    }

    // Ensure SDK is initialized
    if (!isAdReady) {
      console.log('[useAdMob] Ad not ready, attempting to load now...');
      const loaded = await loadRewardedAd();
      if (!loaded) {
        return { success: false, error: 'Ad failed to load. Please try again.' };
      }
    }

    rewardEarnedRef.current = null;

    try {
      const reward = await showRewardedAd();
      // showRewardVideoAd resolves with the reward when user completes the ad
      if (reward && reward.amount > 0) {
        return { success: true, reward: { type: reward.type, amount: reward.amount } };
      }
      // Fallback: check the listener-captured reward
      if (rewardEarnedRef.current) {
        return { success: true, reward: rewardEarnedRef.current };
      }
      return { success: false, error: 'Ad was closed before completion.' };
    } catch (err: any) {
      console.error('[useAdMob] showRewardedAd error:', err);
      return { success: false, error: err?.message || 'Failed to show ad.' };
    }
  }, [isNative, isAdReady, loadRewardedAd]);

  return {
    isAdReady,
    isLoading,
    isNative,
    initError,
    watchAd,
    loadRewardedAd,
  };
}
