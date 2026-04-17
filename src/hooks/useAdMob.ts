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
  const rewardEarnedRef = useRef(false);

  const loadRewardedAd = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    setIsLoading(true);
    const result = await prepareRewardedAd();
    if (result) {
      setIsAdReady(true);
    } else {
      setIsAdReady(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const native = platform === 'android' || platform === 'ios';
    setIsNative(native);

    if (!native) return;

    let mounted = true;

    (async () => {
      const ok = await initializeAdMob();
      if (!ok) {
        if (mounted) setInitError('AdMob failed to initialize');
        return;
      }

      setupAdListeners({
        onRewardEarned: () => {
          rewardEarnedRef.current = true;
        },
        onAdLoaded: () => {
          if (mounted) {
            setIsAdReady(true);
            setIsLoading(false);
          }
        },
        onAdFailed: (err) => {
          console.error('[useAdMob] Ad failed to load:', err);
          if (mounted) {
            setIsAdReady(false);
            setIsLoading(false);
            // Auto-retry once after 5 seconds
            setTimeout(() => {
              if (mounted) loadRewardedAd();
            }, 5000);
          }
        },
        onAdDismissed: () => {
          if (mounted) {
            setIsAdReady(false);
            // Prepare next ad
            loadRewardedAd();
          }
        },
      });

      await loadRewardedAd();
    })();

    return () => {
      mounted = false;
    };
  }, [loadRewardedAd]);

  const watchAd = useCallback(async (): Promise<{ success: boolean; reward?: { type: string; amount: number } }> => {
    if (!isNative) {
      // Simulate ad watching on web for testing
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, reward: { type: 'coins', amount: 1 } });
        }, 3000);
      });
    }

    if (!isAdReady) {
      await loadRewardedAd();
      // Give it a moment to load
      await new Promise((r) => setTimeout(r, 1500));
    }

    rewardEarnedRef.current = false;
    const reward = await showRewardedAd();

    // showRewardVideoAd resolves with the reward when user completes ad.
    // If null, check the listener flag as backup.
    if (reward) {
      return { success: true, reward: { type: reward.type, amount: reward.amount } };
    }
    if (rewardEarnedRef.current) {
      return { success: true, reward: { type: 'coins', amount: 1 } };
    }
    return { success: false };
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
