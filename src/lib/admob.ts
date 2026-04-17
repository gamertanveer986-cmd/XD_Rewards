import { AdMob, RewardAdOptions, AdLoadInfo, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';
import { supabase } from '@/integrations/supabase/client';

// Cached config
let cachedConfig: { rewardedAdUnitId: string; isTesting: boolean; appId: string } | null = null;
let isInitialized = false;

// Google's official test Ad Unit IDs (use when isTesting=true to avoid policy violations)
const TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

// Production fallback (matches the configured publisher in admob_config table)
const FALLBACK_APP_ID = 'ca-app-pub-4367114791552152~5768719388';
const FALLBACK_REWARDED_AD_UNIT_ID = 'ca-app-pub-4367114791552152/4105457386';

// Fetch AdMob config from database
export async function getAdmobConfig(): Promise<{ rewardedAdUnitId: string; isTesting: boolean; appId: string }> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from('admob_config')
      .select('app_id, rewarded_ad_unit_id, is_testing')
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('[AdMob] Using fallback config:', error?.message);
      cachedConfig = {
        appId: FALLBACK_APP_ID,
        rewardedAdUnitId: FALLBACK_REWARDED_AD_UNIT_ID,
        isTesting: false,
      };
      return cachedConfig;
    }

    cachedConfig = {
      appId: data.app_id || FALLBACK_APP_ID,
      rewardedAdUnitId: data.rewarded_ad_unit_id || FALLBACK_REWARDED_AD_UNIT_ID,
      isTesting: data.is_testing || false,
    };

    console.log('[AdMob] Config loaded:', cachedConfig);
    return cachedConfig;
  } catch (error) {
    console.error('[AdMob] Error fetching config:', error);
    cachedConfig = {
      appId: FALLBACK_APP_ID,
      rewardedAdUnitId: FALLBACK_REWARDED_AD_UNIT_ID,
      isTesting: false,
    };
    return cachedConfig;
  }
}

// Clear cached config (call when admin updates settings)
export function clearAdmobConfigCache(): void {
  cachedConfig = null;
  isInitialized = false;
}

export async function initializeAdMob(): Promise<boolean> {
  if (isInitialized) {
    console.log('[AdMob] Already initialized');
    return true;
  }

  try {
    const config = await getAdmobConfig();

    await AdMob.initialize({
      initializeForTesting: config.isTesting,
      // Empty array = no specific test devices; SDK uses emulator detection
      testingDevices: [],
    });

    // Request tracking authorization on iOS 14+ (no-op on Android)
    try {
      const trackingInfo = await AdMob.trackingAuthorizationStatus();
      if (trackingInfo.status === 'notDetermined') {
        await AdMob.requestTrackingAuthorization();
      }
    } catch (err) {
      // Not supported on this platform — safe to ignore
      console.log('[AdMob] Tracking authorization not available');
    }

    isInitialized = true;
    console.log('[AdMob] Initialized successfully with app ID:', config.appId);
    return true;
  } catch (error) {
    console.error('[AdMob] Initialization failed:', error);
    return false;
  }
}

export async function prepareRewardedAd(): Promise<AdLoadInfo | null> {
  const config = await getAdmobConfig();

  // When testing, use Google's official test ad unit to guarantee fill
  const adId = config.isTesting ? TEST_REWARDED_AD_UNIT_ID : config.rewardedAdUnitId;

  const options: RewardAdOptions = {
    adId,
    isTesting: config.isTesting,
  };

  try {
    const result = await AdMob.prepareRewardVideoAd(options);
    console.log('[AdMob] Rewarded ad prepared with adId:', adId, result);
    return result;
  } catch (error) {
    console.error('[AdMob] Failed to prepare rewarded ad:', error);
    return null;
  }
}

export async function showRewardedAd(): Promise<AdMobRewardItem | null> {
  try {
    const result = await AdMob.showRewardVideoAd();
    console.log('[AdMob] Rewarded ad completed:', result);
    return result;
  } catch (error) {
    console.error('[AdMob] Failed to show rewarded ad:', error);
    return null;
  }
}

// Event listeners for ad events
export function setupAdListeners(callbacks: {
  onRewardEarned?: (reward: AdMobRewardItem) => void;
  onAdLoaded?: () => void;
  onAdFailed?: (error: any) => void;
  onAdDismissed?: () => void;
}) {
  AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
    console.log('[AdMob] Reward earned:', reward);
    callbacks.onRewardEarned?.(reward);
  });

  AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
    console.log('[AdMob] Rewarded ad loaded');
    callbacks.onAdLoaded?.();
  });

  AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error: any) => {
    console.error('[AdMob] Rewarded ad failed to load:', error);
    callbacks.onAdFailed?.(error);
  });

  AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
    console.log('[AdMob] Rewarded ad dismissed');
    callbacks.onAdDismissed?.();
  });
}
