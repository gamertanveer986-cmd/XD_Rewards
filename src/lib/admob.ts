import { AdMob, RewardAdOptions, AdLoadInfo, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';
import { supabase } from '@/integrations/supabase/client';

// Cached config
let cachedConfig: { rewardedAdUnitId: string; isTesting: boolean } | null = null;

// Fetch AdMob config from database
export async function getAdmobConfig(): Promise<{ rewardedAdUnitId: string; isTesting: boolean }> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const { data, error } = await supabase
      .from('admob_config')
      .select('rewarded_ad_unit_id, is_testing')
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('Using fallback AdMob config');
      return {
        rewardedAdUnitId: 'ca-app-pub-3054032487800382/2547473951',
        isTesting: false
      };
    }

    cachedConfig = {
      rewardedAdUnitId: data.rewarded_ad_unit_id,
      isTesting: data.is_testing || false
    };

    return cachedConfig;
  } catch (error) {
    console.error('Error fetching AdMob config:', error);
    return {
      rewardedAdUnitId: 'ca-app-pub-3054032487800382/2547473951',
      isTesting: false
    };
  }
}

// Clear cached config (call when admin updates settings)
export function clearAdmobConfigCache(): void {
  cachedConfig = null;
}

export async function initializeAdMob(): Promise<void> {
  try {
    const config = await getAdmobConfig();
    await AdMob.initialize({
      initializeForTesting: config.isTesting,
    });
    console.log('AdMob initialized successfully');
  } catch (error) {
    console.error('AdMob initialization failed:', error);
  }
}

export async function prepareRewardedAd(): Promise<AdLoadInfo | null> {
  const config = await getAdmobConfig();
  
  const options: RewardAdOptions = {
    adId: config.rewardedAdUnitId,
    isTesting: config.isTesting,
  };

  try {
    const result = await AdMob.prepareRewardVideoAd(options);
    console.log('Rewarded ad prepared:', result);
    return result;
  } catch (error) {
    console.error('Failed to prepare rewarded ad:', error);
    return null;
  }
}

export async function showRewardedAd(): Promise<AdMobRewardItem | null> {
  try {
    const result = await AdMob.showRewardVideoAd();
    console.log('Rewarded ad completed:', result);
    return result;
  } catch (error) {
    console.error('Failed to show rewarded ad:', error);
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
    console.log('Reward earned:', reward);
    callbacks.onRewardEarned?.(reward);
  });

  AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
    console.log('Rewarded ad loaded');
    callbacks.onAdLoaded?.();
  });

  AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error: any) => {
    console.log('Rewarded ad failed to load:', error);
    callbacks.onAdFailed?.(error);
  });

  AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
    console.log('Rewarded ad dismissed');
    callbacks.onAdDismissed?.();
  });
}
