import { useState, useEffect, useCallback, useMemo } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { Linking, Platform } from 'react-native';
import { VideoAsset } from '../types/video';

export type PermissionState = 'undetermined' | 'granted' | 'limited' | 'denied';
export type SortOption = 'date_desc' | 'date_asc' | 'title_asc' | 'duration_desc';

const PAGE_SIZE = 50;

export function useMediaLibrary() {
  const [permissionState, setPermissionState] = useState<PermissionState>('undetermined');
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [totalVideos, setTotalVideos] = useState<number>(0);

  // Request or check media permissions
  const checkAndRequestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const current = await MediaLibrary.getPermissionsAsync();

      if (current.granted) {
        setPermissionState('granted');
        return true;
      }

      if (current.accessPrivileges === 'limited') {
        setPermissionState('limited');
        return true;
      }

      // If undetermined or can ask again, trigger native dialog
      if (current.canAskAgain) {
        const response = await MediaLibrary.requestPermissionsAsync();
        if (response.granted) {
          setPermissionState('granted');
          return true;
        } else if (response.accessPrivileges === 'limited') {
          setPermissionState('limited');
          return true;
        } else {
          setPermissionState('denied');
          return false;
        }
      } else {
        setPermissionState('denied');
        return false;
      }
    } catch (error) {
      console.warn('Error checking media permissions:', error);
      setPermissionState('denied');
      return false;
    }
  }, []);

  // Open OS system settings if permission was denied permanently
  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  // Map Expo Asset to internal VideoAsset type
  const mapAssetToVideo = (item: MediaLibrary.Asset): VideoAsset => ({
    id: item.id,
    uri: item.uri,
    filename: item.filename,
    duration: Math.round(item.duration),
    width: item.width,
    height: item.height,
    modificationTime: item.modificationTime,
  });

  // Fetch initial batch of video files
  const fetchVideos = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await MediaLibrary.getAssetsAsync({
        mediaType: [MediaLibrary.MediaType.video],
        first: PAGE_SIZE,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });

      const mapped = response.assets.map(mapAssetToVideo);
      setAssets(mapped);
      setEndCursor(response.endCursor);
      setHasNextPage(response.hasNextPage);
      setTotalVideos(response.totalCount);
    } catch (error) {
      console.warn('Failed to scan video assets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load next batch for infinite scrolling pagination
  const loadMoreVideos = useCallback(async () => {
    if (!hasNextPage || loadingMore || loading || refreshing) return;

    setLoadingMore(true);
    try {
      const response = await MediaLibrary.getAssetsAsync({
        mediaType: [MediaLibrary.MediaType.video],
        first: PAGE_SIZE,
        after: endCursor,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });

      const nextAssets = response.assets.map(mapAssetToVideo);
      setAssets((prev) => [...prev, ...nextAssets]);
      setEndCursor(response.endCursor);
      setHasNextPage(response.hasNextPage);
    } catch (error) {
      console.warn('Error loading more video assets:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNextPage, loadingMore, loading, refreshing, endCursor]);

  // Initial load
  useEffect(() => {
    (async () => {
      const hasPermission = await checkAndRequestPermission();
      if (hasPermission) {
        await fetchVideos();
      } else {
        setLoading(false);
      }
    })();
  }, [checkAndRequestPermission, fetchVideos]);

  // Filter and sort items locally
  const filteredAssets = useMemo(() => {
    let result = assets;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((asset) => asset.filename.toLowerCase().includes(query));
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return (b.modificationTime || 0) - (a.modificationTime || 0);
        case 'date_asc':
          return (a.modificationTime || 0) - (b.modificationTime || 0);
        case 'title_asc':
          return a.filename.localeCompare(b.filename);
        case 'duration_desc':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });
  }, [assets, searchQuery, sortBy]);

  return {
    permissionState,
    checkAndRequestPermission,
    openSettings,
    videos: filteredAssets,
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
  };
}
