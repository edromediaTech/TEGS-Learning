/**
 * Bridge natif Capacitor — détecte si on est en mode mobile natif
 * et expose les APIs natives (haptics, push, camera, lockdown).
 */
export function useNativeBridge() {
  const isNative = ref(false);
  const platform = ref<'web' | 'ios' | 'android'>('web');

  onMounted(async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative.value = Capacitor.isNativePlatform();
      platform.value = Capacitor.getPlatform() as 'web' | 'ios' | 'android';
    } catch {
      // Not in Capacitor context
    }
  });

  // --- Haptics (vibration) ---
  async function vibrate(style: 'light' | 'medium' | 'heavy' = 'medium') {
    if (!isNative.value) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: map[style] });
    } catch {}
  }

  async function vibrateAlert() {
    if (!isNative.value) return;
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Error });
    } catch {}
  }

  // --- Push Notifications ---
  async function registerPush(): Promise<string | null> {
    if (!isNative.value) return null;
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        await PushNotifications.register();
        return new Promise((resolve) => {
          PushNotifications.addListener('registration', (token) => {
            resolve(token.value);
          });
          PushNotifications.addListener('registrationError', () => {
            resolve(null);
          });
        });
      }
    } catch {}
    return null;
  }

  function onPushReceived(callback: (notification: any) => void) {
    if (!isNative.value) return;
    import('@capacitor/push-notifications').then(({ PushNotifications }) => {
      PushNotifications.addListener('pushNotificationReceived', callback);
    }).catch(() => {});
  }

  // --- Camera (pour proctoring / selfie identification) ---
  async function takePhoto(): Promise<string | null> {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 640,
        height: 480,
      });
      return image.base64String ? `data:image/${image.format};base64,${image.base64String}` : null;
    } catch {
      return null;
    }
  }

  // --- Status Bar ---
  async function setStatusBarDark() {
    if (!isNative.value) return;
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
    } catch {}
  }

  async function hideStatusBar() {
    if (!isNative.value) return;
    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.hide();
    } catch {}
  }

  // --- App Lockdown (App Pinning / Guided Access) ---
  // Note: True app pinning requires platform-specific code.
  // On web/PWA we use fullscreen + disable back button.
  async function enterLockdown() {
    // Fullscreen mode
    try {
      await document.documentElement.requestFullscreen();
    } catch {}

    // Disable back button on Android
    if (isNative.value) {
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', (e) => {
          // Block back button in lockdown mode
          // Do nothing — prevent exit
        });
      } catch {}
    }

    // Prevent page visibility changes (tab switching detection)
    return true;
  }

  async function exitLockdown() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  }

  // --- Open external URL ---
  async function openExternal(url: string) {
    if (isNative.value) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
        return;
      } catch {}
    }
    window.open(url, '_blank');
  }

  return {
    isNative,
    platform,
    vibrate,
    vibrateAlert,
    registerPush,
    onPushReceived,
    takePhoto,
    setStatusBarDark,
    hideStatusBar,
    enterLockdown,
    exitLockdown,
    openExternal,
  };
}
