import { AdMob, RewardAdOptions, AdLoadInfo, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';

// Production AdMob IDs
const REWARDED_AD_UNIT_ID = 'ca-app-pub-3054032487800382/2547473951';

export async function initializeAdMob(): Promise<void> {
  try {
    await AdMob.initialize({
      initializeForTesting: false,
    });
    console.log('AdMob initialized successfully');
  } catch (error) {
    console.error('AdMob initialization failed:', error);
  }
}

export async function prepareRewardedAd(): Promise<AdLoadInfo | null> {
  const options: RewardAdOptions = {
    adId: REWARDED_AD_UNIT_ID,
    isTesting: false,
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
