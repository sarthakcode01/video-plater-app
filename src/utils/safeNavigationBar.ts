import { Platform } from 'react-native';

let NavigationBarModule: any = null;

if (Platform.OS === 'android') {
  try {
    // Dynamically require to safely handle APKs that don't yet have the native module compiled
    NavigationBarModule = require('expo-navigation-bar');
  } catch (err) {
    // Native module not linked in the currently installed APK
    NavigationBarModule = null;
  }
}

export const SafeNavigationBar = {
  isAvailable: (): boolean => !!NavigationBarModule,

  setBackgroundColorAsync: async (color: string): Promise<void> => {
    try {
      if (NavigationBarModule?.setBackgroundColorAsync) {
        await NavigationBarModule.setBackgroundColorAsync(color);
      }
    } catch (e) {
      // Ignored if unsupported on current Android version/build
    }
  },

  setBorderColorAsync: async (color: string): Promise<void> => {
    try {
      if (NavigationBarModule?.setBorderColorAsync) {
        await NavigationBarModule.setBorderColorAsync(color);
      }
    } catch (e) {
      // Ignored: only available on Android API 28+
    }
  },

  setButtonStyleAsync: async (style: 'light' | 'dark'): Promise<void> => {
    try {
      if (NavigationBarModule?.setButtonStyleAsync) {
        await NavigationBarModule.setButtonStyleAsync(style);
      }
    } catch (e) {
      // Ignored
    }
  },

  setVisibilityAsync: async (visibility: 'visible' | 'hidden'): Promise<void> => {
    try {
      if (NavigationBarModule?.setVisibilityAsync) {
        await NavigationBarModule.setVisibilityAsync(visibility);
      }
    } catch (e) {
      // Ignored
    }
  },

  setBehaviorAsync: async (behavior: 'overlay-swipe' | 'inset-swipe' | 'inset-touch'): Promise<void> => {
    try {
      if (NavigationBarModule?.setBehaviorAsync) {
        await NavigationBarModule.setBehaviorAsync(behavior);
      }
    } catch (e) {
      // Ignored
    }
  },
};
