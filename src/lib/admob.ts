import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdOptions, RewardAdOptions, AdLoadInfo, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';

// Your AdMob IDs
const AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
const REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917'; // Test rewarded ad

export async function initializeAdMob(): Promise<void> {
  try {
    await AdMob.initialize({
      initializeForTesting: true, // Set to false in production
    });
    console.log('AdMob initialized successfully');
  } catch (error) {
    console.error('AdMob initialization failed:', error);
  }
}

export async function showBannerAd(): Promise<void> {
  const options: BannerAdOptions = {
    adId: AD_UNIT_ID,
    adSize: BannerAdSize.BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: true, // Set to false in production
  };

  try {
    await AdMob.showBanner(options);
    console.log('Banner ad shown');
  } catch (error) {
    console.error('Failed to show banner ad:', error);
  }
}

export async function hideBannerAd(): Promise<void> {
  try {
    await AdMob.hideBanner();
    console.log('Banner ad hidden');
  } catch (error) {
    console.error('Failed to hide banner ad:', error);
  }
}

export async function showInterstitialAd(): Promise<void> {
  const options: AdOptions = {
    adId: AD_UNIT_ID,
    isTesting: true, // Set to false in production
  };

  try {
    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
    console.log('Interstitial ad shown');
  } catch (error) {
    console.error('Failed to show interstitial ad:', error);
  }
}

export async function prepareRewardedAd(): Promise<AdLoadInfo | null> {
  const options: RewardAdOptions = {
    adId: REWARDED_AD_UNIT_ID,
    isTesting: true, // Set to false in production
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
