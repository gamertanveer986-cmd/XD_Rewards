import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initializeUnityAds,
  isNativePlatform,
  isRewardedReady,
  loadRewardedAd,
  showRewardedAd,
} from '@/lib/unityAds';

const LOAD_TIMEOUT_MS = 10_000;

export function useUnityAds() {
  const [isNative] = useState<boolean>(isNativePlatform());
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initRef = useRef(false);

  const prepare = useCallback(async () => {
    if (!isNative) return false;
    setIsLoading(true);
    setLoadError(null);

    const ok = await loadRewardedAd();
    if (!ok) {
      setIsLoading(false);
      setIsReady(false);
      setLoadError('Ad failed to load. Please try again.');
      return false;
    }

    // Poll until ready OR timeout — never leave the button hanging forever.
    const start = Date.now();
    while (Date.now() - start < LOAD_TIMEOUT_MS) {
      if (await isRewardedReady()) {
        setIsReady(true);
        setIsLoading(false);
        return true;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    setIsLoading(false);
    setIsReady(false);
    setLoadError('Ad timed out. Please try again.');
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
      if (!ok) return { success: false, error: loadError || 'Ad not ready yet.' };
    }
    const res = await showRewardedAd();
    setIsReady(false);
    // Auto re-load next ad (silently)
    prepare();
    return res;
  }, [isNative, isReady, prepare, loadError]);

  const retry = useCallback(async () => {
    setLoadError(null);
    setIsReady(false);
    if (!initRef.current) {
      const ok = await initializeUnityAds();
      if (!ok) {
        setInitError('Unity Ads failed to initialize.');
        return false;
      }
      initRef.current = true;
    }
    return prepare();
  }, [prepare]);

  return { isNative, isReady, isLoading, initError, loadError, watch, prepare, retry };
}
