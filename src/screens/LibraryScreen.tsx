import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMediaLibraryStore } from '../context/MediaLibraryContext';
import { VideoCard } from '../components/VideoCard';
import { FolderCard } from '../components/FolderCard';
import { FolderTabBar } from '../components/FolderTabBar';
import { PermissionPrompt } from '../components/PermissionPrompt';
import { EmptyLibrary } from '../components/EmptyLibrary';
import { LibraryHeader } from '../components/LibraryHeader';
import { VideoAsset, VideoFolder } from '../types/video';
import { COLORS, SPACING } from '../constants/theme';

interface LibraryScreenProps {
  onSelectVideo: (asset: VideoAsset) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onSelectVideo }) => {
  const insets = useSafeAreaInsets();
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const {
    permissionState,
    checkAndRequestPermission,
    openSettings,
    loading,
    isRefreshing,
    refreshLibrary,
    folders,
    filteredVideos,
    totalVideosCount,
    selectedFolderId,
    setSelectedFolderId,
    selectedFolderName,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    durationFilter,
    setDurationFilter,
    viewMode,
    setViewMode,
  } = useMediaLibraryStore();

  // Handle folder card selection in Folders View
  const handleSelectFolderCard = (folder: VideoFolder) => {
    setSelectedFolderId(folder.id);
    setViewMode('videos'); // switch to viewing the videos inside this folder
  };

  // If permission is denied or undetermined, show permission screen
  if (permissionState === 'denied' || (permissionState === 'undetermined' && !loading)) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <PermissionPrompt
          permissionState={permissionState}
          onRequestPermission={checkAndRequestPermission}
          onOpenSettings={openSettings}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header with Title, Search, Refresh Diffs, Filter, and View toggler */}
      <LibraryHeader
        totalCount={totalVideosCount}
        filteredCount={filteredVideos.length}
        selectedFolderName={selectedFolderName}
        isFolderSelected={selectedFolderId !== null}
        onClearFolder={() => setSelectedFolderId(null)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        layout={layout}
        onToggleLayout={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'videos' ? 'folders' : 'videos')}
        sortBy={sortBy}
        onChangeSort={setSortBy}
        durationFilter={durationFilter}
        onChangeDurationFilter={setDurationFilter}
        isRefreshing={isRefreshing}
        onRefresh={refreshLibrary}
      />

      {/* Top Folder Chips (Visible in Videos View) */}
      {viewMode === 'videos' && (
        <FolderTabBar
          folders={folders}
          selectedFolderId={selectedFolderId}
          totalVideosCount={totalVideosCount}
          onSelectFolder={setSelectedFolderId}
        />
      )}

      {/* Limited Access Reminder (Android 14+ / iOS) */}
      {permissionState === 'limited' && (
        <PermissionPrompt
          permissionState={permissionState}
          onRequestPermission={checkAndRequestPermission}
          onOpenSettings={openSettings}
        />
      )}

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : viewMode === 'folders' ? (
        /* Folder Grid View */
        <FlatList
          data={folders}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <FolderCard folder={item} onPress={handleSelectFolderCard} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshLibrary}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyLibrary
              isSearching={false}
              onRefresh={refreshLibrary}
            />
          }
        />
      ) : (
        /* Videos List/Grid View */
        <FlatList
          key={layout}
          data={filteredVideos}
          keyExtractor={(item) => item.id}
          numColumns={layout === 'grid' ? 2 : 1}
          columnWrapperStyle={layout === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <VideoCard asset={item} onPress={onSelectVideo} layout={layout} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshLibrary}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyLibrary
              isSearching={searchQuery.length > 0 || durationFilter !== 'all'}
              onClearSearch={() => {
                setSearchQuery('');
                setDurationFilter('all');
                setSelectedFolderId(null);
              }}
              onRefresh={refreshLibrary}
            />
          }
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
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
});
