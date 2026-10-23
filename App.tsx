import React, { useState } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MediaLibraryProvider } from './src/context/MediaLibraryContext';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { VideoAsset } from './src/types/video';
import { COLORS } from './src/constants/theme';

export default function App() {
  const [selectedVideo, setSelectedVideo] = useState<VideoAsset | null>(null);

  // Handle hardware back button on Android
  React.useEffect(() => {
    const onBackPress = () => {
      if (selectedVideo) {
        setSelectedVideo(null);
        return true; // handled
      }
      return false; // let system exit app
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedVideo]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <MediaLibraryProvider>
          <View style={styles.container}>
            {/* LibraryScreen remains mounted permanently in background to preserve scroll and state */}
            <LibraryScreen onSelectVideo={(asset) => setSelectedVideo(asset)} />

            {/* PlayerScreen mounts as an absolute overlay when a video is selected */}
            {selectedVideo && (
              <View style={StyleSheet.absoluteFill}>
                <PlayerScreen asset={selectedVideo} onClose={() => setSelectedVideo(null)} />
              </View>
            )}
          </View>
        </MediaLibraryProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
