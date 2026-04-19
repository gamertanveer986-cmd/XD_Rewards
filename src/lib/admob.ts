import { AdMob, RewardAdOptions, AdLoadInfo, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';
import { supabase } from '@/integrations/supabase/client';

// Cached config (cleared whenever admin updates settings)
let cachedConfig: { rewardedAdUnitId: string; isTesting: boolean; appId: string } | null = null;
let isInitialized = false;
let listenersAttached = false;

// Google's official test Ad Unit IDs — guaranteed to fill
const TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

/**
 * Fetch AdMob config from database. NO hardcoded production fallback —
 * if the admin has not configured it, this throws so the UI can show an error.
 */
export async function getAdmobConfig(): Promise<{ rewardedAdUnitId: string; isTesting: boolean; appId: string }> {
  if (cachedConfig) {
    console.log('[AdMob] Using cached config:', cachedConfig);
    return cachedConfig;
  }

  const { data, error } = await supabase
    .from('admob_config')
    .select('app_id, rewarded_ad_unit_id, is_testing')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[AdMob] Failed to fetch config from database:', error);
    throw new Error(`AdMob config fetch failed: ${error.message}`);
  }

  if (!data || !data.app_id || !data.rewarded_ad_unit_id) {
    console.error('[AdMob] No AdMob config found in database. Admin must configure it.');
    throw new Error('AdMob is not configured. Please contact admin.');
  }

  cachedConfig = {
    appId: data.app_id,
    rewardedAdUnitId: data.rewarded_ad_unit_id,
    isTesting: data.is_testing ?? false,
  };

  console.log('[AdMob] ✅ Config loaded from database:', cachedConfig);
  return cachedConfig;
}

/** Clear cached config — call this from admin panel after saving new IDs */
export function clearAdmobConfigCache(): void {
  console.log('[AdMob] 🔄 Cache cleared');
  cachedConfig = null;
  isInitialized = false;
}

export async function initializeAdMob(): Promise<boolean> {
  if (isInitialized) {
    console.log('[AdMob] ✅ Already initialized — skipping');
    return true;
  }

  try {
    const config = await getAdmobConfig();

    console.log('[AdMob] 🚀 Initializing SDK | App ID:', config.appId, '| Testing:', config.isTesting);

    await AdMob.initialize({
      initializeForTesting: config.isTesting,
      testingDevices: [],
    });

    // iOS 14+ tracking authorization (no-op on Android)
    try {
      const trackingInfo = await AdMob.trackingAuthorizationStatus();
      console.log('[AdMob] Tracking status:', trackingInfo.status);
      if (trackingInfo.status === 'notDetermined') {
        await AdMob.requestTrackingAuthorization();
      }
    } catch {
      console.log('[AdMob] Tracking authorization not available on this platform');
    }

    isInitialized = true;
    console.log('[AdMob] ✅ SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('[AdMob] ❌ Initialization failed:', error);
    return false;
  }
}

/**
 * Prepares a rewarded ad. Resolves only AFTER the ad is actually loaded
 * (or rejects on failure). This is the source of truth for "is ad ready".
 */
export async function prepareRewardedAd(): Promise<AdLoadInfo | null> {
  try {
    const config = await getAdmobConfig();

    // When testing flag is on, force Google's official test ad unit to guarantee fill
    const adId = config.isTesting ? TEST_REWARDED_AD_UNIT_ID : config.rewardedAdUnitId;

    console.log('[AdMob] 📥 Preparing rewarded ad → adId:', adId, '| testing:', config.isTesting);

    const options: RewardAdOptions = {
      adId,
      isTesting: config.isTesting,
    };

    const result = await AdMob.prepareRewardVideoAd(options);
    console.log('[AdMob] ✅ Rewarded ad prepared & ready to show:', result);
    return result;
  } catch (error) {
    console.error('[AdMob] ❌ Failed to prepare rewarded ad:', error);
    throw error;
  }
}

export async function showRewardedAd(): Promise<AdMobRewardItem | null> {
  try {
    console.log('[AdMob] 🎬 Showing rewarded ad...');
    const result = await AdMob.showRewardVideoAd();
    console.log('[AdMob] ✅ Rewarded ad completed, reward:', result);
    return result;
  } catch (error) {
    console.error('[AdMob] ❌ Failed to show rewarded ad:', error);
    throw error;
  }
}

// Event listeners — attach once globally
export function setupAdListeners(callbacks: {
  onRewardEarned?: (reward: AdMobRewardItem) => void;
  onAdLoaded?: () => void;
  onAdFailed?: (error: any) => void;
  onAdDismissed?: () => void;
}) {
  if (listenersAttached) {
    console.log('[AdMob] Listeners already attached — replacing callbacks');
  }
  listenersAttached = true;

  AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
    console.log('[AdMob] 🎁 Reward earned event:', reward);
    callbacks.onRewardEarned?.(reward);
  });

  AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
    console.log('[AdMob] 📦 Loaded event fired');
    callbacks.onAdLoaded?.();
  });

  AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error: any) => {
    console.error('[AdMob] 💥 FailedToLoad event:', JSON.stringify(error));
    callbacks.onAdFailed?.(error);
  });

  AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
    console.log('[AdMob] 👋 Dismissed event');
    callbacks.onAdDismissed?.();
  });
}
