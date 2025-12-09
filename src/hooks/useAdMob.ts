import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  initializeAdMob, 
  prepareRewardedAd, 
  showRewardedAd, 
  setupAdListeners
} from '@/lib/admob';

export function useAdMob() {
  const [isAdReady, setIsAdReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const native = platform === 'android' || platform === 'ios';
    setIsNative(native);

    if (native) {
      initializeAdMob().then(() => {
        loadRewardedAd();
      });

      setupAdListeners({
        onAdLoaded: () => {
          setIsAdReady(true);
          setIsLoading(false);
        },
        onAdFailed: () => {
          setIsAdReady(false);
          setIsLoading(false);
        },
        onAdDismissed: () => {
          setIsAdReady(false);
          // Prepare next ad
          loadRewardedAd();
        },
      });
    }
  }, []);

  const loadRewardedAd = useCallback(async () => {
    setIsLoading(true);
    const result = await prepareRewardedAd();
    if (result) {
      setIsAdReady(true);
    }
    setIsLoading(false);
  }, []);

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
    }

    const reward = await showRewardedAd();
    if (reward) {
      return { success: true, reward: { type: reward.type, amount: reward.amount } };
    }
    return { success: false };
  }, [isNative, isAdReady, loadRewardedAd]);

  return {
    isAdReady,
    isLoading,
    isNative,
    watchAd,
    loadRewardedAd,
  };
}
