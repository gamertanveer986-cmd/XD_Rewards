import { Capacitor } from '@capacitor/core';

// Official Unity Ads credentials for XD Rewards
export const UNITY_GAME_ID_ANDROID = '800077969';
export const UNITY_REWARDED_PLACEMENT_ID = 'Rewarded_Android';
export const UNITY_TEST_MODE = false;

let initialized = false;
let initPromise: Promise<boolean> | null = null;

export function isNativePlatform(): boolean {
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios';
}

async function getPlugin() {
  if (!isNativePlatform()) return null;
  try {
    const mod = await import('capacitor-unity-ads');
    // The plugin exports `UnityAds`
    return (mod as any).UnityAds ?? null;
  } catch (err) {
    console.error('[UnityAds] Failed to import plugin:', err);
    return null;
  }
}

export async function initializeUnityAds(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  if (initialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const UnityAds = await getPlugin();
    if (!UnityAds) return false;
    try {
      await UnityAds.initialize({
        gameId: UNITY_GAME_ID_ANDROID,
        testMode: UNITY_TEST_MODE,
      });
      initialized = true;
      console.log('[UnityAds] ✅ Initialized', { gameId: UNITY_GAME_ID_ANDROID });
      return true;
    } catch (err) {
      console.error('[UnityAds] ❌ Init failed:', err);
      return false;
    }
  })();

  return initPromise;
}

export async function loadRewardedAd(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const UnityAds = await getPlugin();
  if (!UnityAds) return false;
  try {
    await UnityAds.loadRewardedVideo({ placementId: UNITY_REWARDED_PLACEMENT_ID });
    return true;
  } catch (err) {
    console.error('[UnityAds] loadRewardedVideo failed:', err);
    return false;
  }
}

export async function isRewardedReady(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const UnityAds = await getPlugin();
  if (!UnityAds) return false;
  try {
    const res = await UnityAds.isRewardedVideoLoaded();
    return !!res?.loaded;
  } catch {
    return false;
  }
}

export async function showRewardedAd(): Promise<{ success: boolean; error?: string }> {
  if (!isNativePlatform()) {
    return { success: false, error: 'Unity Ads only runs on mobile.' };
  }
  const UnityAds = await getPlugin();
  if (!UnityAds) return { success: false, error: 'Unity Ads plugin unavailable.' };
  try {
    const res = await UnityAds.showRewardedVideo();
    if (res?.success) return { success: true };
    return { success: false, error: 'Ad was not completed.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to show ad.' };
  }
}
