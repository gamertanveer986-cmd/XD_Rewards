import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initializeUnityAds,
  isNativePlatform,
  isRewardedReady,
  loadRewardedAd,
  showRewardedAd,
} from '@/lib/unityAds';

export function useUnityAds() {
  const [isNative] = useState<boolean>(isNativePlatform());
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const initRef = useRef(false);

  const prepare = useCallback(async () => {
    if (!isNative) return false;
    setIsLoading(true);
    const ok = await loadRewardedAd();
    if (ok) {
      // poll briefly until ready
      for (let i = 0; i < 20; i++) {
        if (await isRewardedReady()) {
          setIsReady(true);
          setIsLoading(false);
          return true;
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }
    setIsLoading(false);
    setIsReady(false);
    return false;
  }, [isNative]);

  useEffect(() => {
    if (!isNative || initRef.current) return;
    initRef.current = true;
    (async () => {
      const ok = await initializeUnityAds();
      if (!ok) {
        setInitError('Unity Ads failed to initialize.');
        return;
      }
      await prepare();
    })();
  }, [isNative, prepare]);

  const watch = useCallback(async () => {
    if (!isNative) return { success: false, error: 'Not on native platform.' };
    if (!isReady) {
      const ok = await prepare();
      if (!ok) return { success: false, error: 'Ad not ready yet.' };
    }
    const res = await showRewardedAd();
    setIsReady(false);
    // Auto re-load next ad
    prepare();
    return res;
  }, [isNative, isReady, prepare]);

  return { isNative, isReady, isLoading, initError, watch, prepare };
}
