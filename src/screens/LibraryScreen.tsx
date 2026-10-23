import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import { VideoCard } from '../components/VideoCard';
import { PermissionPrompt } from '../components/PermissionPrompt';
import { EmptyLibrary } from '../components/EmptyLibrary';
import { LibraryHeader } from '../components/LibraryHeader';
import { VideoAsset } from '../types/video';
import { COLORS, SPACING } from '../constants/theme';

interface LibraryScreenProps {
  onSelectVideo: (asset: VideoAsset) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onSelectVideo }) => {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const {
    permissionState,
    checkAndRequestPermission,
    openSettings,
    videos,
    totalVideos,
    loading,
    refreshing,
    loadingMore,
    fetchVideos,
    loadMoreVideos,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
  } = useMediaLibrary();

  // If permission is denied or undetermined, show permission screen
  if (permissionState === 'denied' || (permissionState === 'undetermined' && !loading)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <PermissionPrompt
          permissionState={permissionState}
          onRequestPermission={checkAndRequestPermission}
          onOpenSettings={openSettings}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header with Title, Search & Layout controls */}
      <LibraryHeader
        totalCount={totalVideos}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        layout={layout}
        onToggleLayout={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
        sortBy={sortBy}
        onChangeSort={setSortBy}
      />

      {/* Limited Access Reminder (Android 14+ / iOS) */}
      {permissionState === 'limited' && (
        <PermissionPrompt
          permissionState={permissionState}
          onRequestPermission={checkAndRequestPermission}
          onOpenSettings={openSettings}
        />
      )}

      {/* Initial Loading Indicator */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          key={layout} // re-mount list when switching layout mode
          data={videos}
          keyExtractor={(item) => item.id}
          numColumns={layout === 'grid' ? 2 : 1}
          columnWrapperStyle={layout === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <VideoCard asset={item} onPress={onSelectVideo} layout={layout} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchVideos(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={loadMoreVideos}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyLibrary
              isSearching={searchQuery.length > 0}
              onClearSearch={() => setSearchQuery('')}
              onRefresh={() => fetchVideos(true)}
            />
          }
          // Performance optimizations for large video libraries
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoading: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
});
