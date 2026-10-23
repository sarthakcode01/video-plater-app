import React, { useState } from 'react';
import { StyleSheet, BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    <GestureHandlerRootView style={styles.container}>
      {selectedVideo ? (
        <PlayerScreen asset={selectedVideo} onClose={() => setSelectedVideo(null)} />
      ) : (
        <LibraryScreen onSelectVideo={(asset) => setSelectedVideo(asset)} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
