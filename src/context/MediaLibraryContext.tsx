import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { Linking, Platform } from 'react-native';
import { VideoAsset, VideoFolder, SortOption, DurationFilterOption, LibraryViewMode } from '../types/video';
import { getPlaybackPosition } from '../utils/watchHistory';

export type PermissionState = 'undetermined' | 'granted' | 'limited' | 'denied';

interface MediaLibraryContextType {
  permissionState: PermissionState;
  checkAndRequestPermission: () => Promise<boolean>;
  openSettings: () => void;
  loading: boolean;
  isRefreshing: boolean;
  refreshLibrary: () => Promise<void>;
  // Data
  allVideos: VideoAsset[];
  folders: VideoFolder[];
  filteredVideos: VideoAsset[];
  totalVideosCount: number;
  // Navigation & Filters
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  selectedFolderName: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  durationFilter: DurationFilterOption;
  setDurationFilter: (filter: DurationFilterOption) => void;
  viewMode: LibraryViewMode;
  setViewMode: (mode: LibraryViewMode) => void;
}

const MediaLibraryContext = createContext<MediaLibraryContextType | undefined>(undefined);

// Maximum assets to query per pass to capture full library
const SCAN_BATCH_SIZE = 600;

export const MediaLibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissionState, setPermissionState] = useState<PermissionState>('undetermined');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [allVideos, setAllVideos] = useState<VideoAsset[]>([]);
  const [folders, setFolders] = useState<VideoFolder[]>([]);

  // Navigation and filter states
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [durationFilter, setDurationFilter] = useState<DurationFilterOption>('all');
  const [viewMode, setViewMode] = useState<LibraryViewMode>('videos');

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

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  // Map MediaLibrary Asset to internal VideoAsset with watch history
  const mapAsset = async (item: MediaLibrary.Asset, albumTitleMap: Record<string, string>): Promise<VideoAsset> => {
    const history = await getPlaybackPosition(item.id);
    return {
      id: item.id,
      uri: item.uri,
      filename: item.filename,
      duration: Math.round(item.duration),
      width: item.width,
      height: item.height,
      modificationTime: item.modificationTime,
      albumId: item.albumId,
      albumTitle: item.albumId && albumTitleMap[item.albumId] ? albumTitleMap[item.albumId] : 'Internal',
      watchProgressPercent: history ? history.percent : 0,
    };
  };

  // Scan storage once and index albums + assets
  const scanStorage = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Fetch Albums / Folders
      let albums: MediaLibrary.Album[] = [];
      try {
        albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
      } catch (albumErr) {
        console.warn('Album scan error:', albumErr);
      }

      const albumTitleMap: Record<string, string> = {};
      albums.forEach((album) => {
        albumTitleMap[album.id] = album.title;
      });

      // 2. Fetch Video Assets
      const assetsResponse = await MediaLibrary.getAssetsAsync({
        mediaType: [MediaLibrary.MediaType.video],
        first: SCAN_BATCH_SIZE,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });

      // Map assets and attach watch history
      const mappedAssets: VideoAsset[] = await Promise.all(
        assetsResponse.assets.map((asset) => mapAsset(asset, albumTitleMap))
      );

      // 3. Compute folder counts and thumbnail previews
      const folderCounts: Record<string, { count: number; preview?: string; title: string }> = {};

      mappedAssets.forEach((video) => {
        const folderKey = video.albumId || 'uncategorized';
        const folderName = video.albumTitle || 'Videos';
        if (!folderCounts[folderKey]) {
          folderCounts[folderKey] = { count: 0, preview: video.uri, title: folderName };
        }
        folderCounts[folderKey].count += 1;
      });

      const parsedFolders: VideoFolder[] = Object.keys(folderCounts).map((key) => ({
        id: key,
        title: folderCounts[key].title,
        assetCount: folderCounts[key].count,
        previewUri: folderCounts[key].preview,
      }));

      // Sort folders by asset count descending
      parsedFolders.sort((a, b) => b.assetCount - a.assetCount);

      setAllVideos(mappedAssets);
      setFolders(parsedFolders);
    } catch (error) {
      console.warn('Failed to scan video assets:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial scan on mount (strictly runs once!)
  useEffect(() => {
    (async () => {
      const hasPermission = await checkAndRequestPermission();
      if (hasPermission) {
        await scanStorage(false);
      } else {
        setLoading(false);
      }
    })();
  }, [checkAndRequestPermission, scanStorage]);

  // Explicit user-triggered refresh
  const refreshLibrary = useCallback(async () => {
    await scanStorage(true);
  }, [scanStorage]);

  // Selected folder title label
  const selectedFolderName = useMemo(() => {
    if (!selectedFolderId) return 'All Videos';
    const folder = folders.find((f) => f.id === selectedFolderId);
    return folder ? folder.title : 'Folder';
  }, [selectedFolderId, folders]);

  // Compute filtered & sorted videos across the COMPLETE dataset
  const filteredVideos = useMemo(() => {
    let result = allVideos;

    // 1. Folder filter
    if (selectedFolderId) {
      result = result.filter((video) => (video.albumId || 'uncategorized') === selectedFolderId);
    }

    // 2. Duration filter
    if (durationFilter === 'movies') {
      // Videos >= 20 minutes (1200 seconds)
      result = result.filter((video) => video.duration >= 1200);
    } else if (durationFilter === 'shorts') {
      // Videos <= 5 minutes (300 seconds)
      result = result.filter((video) => video.duration <= 300);
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((video) => video.filename.toLowerCase().includes(q));
    }

    // 4. Complete sorting across all matching videos
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'duration_desc':
          return b.duration - a.duration;
        case 'date_desc':
          return (b.modificationTime || 0) - (a.modificationTime || 0);
        case 'date_asc':
          return (a.modificationTime || 0) - (b.modificationTime || 0);
        case 'title_asc':
          return a.filename.localeCompare(b.filename);
        default:
          return 0;
      }
    });
  }, [allVideos, selectedFolderId, durationFilter, searchQuery, sortBy]);

  const value = {
    permissionState,
    checkAndRequestPermission,
    openSettings,
    loading,
    isRefreshing,
    refreshLibrary,
    allVideos,
    folders,
    filteredVideos,
    totalVideosCount: allVideos.length,
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
  };

  return <MediaLibraryContext.Provider value={value}>{children}</MediaLibraryContext.Provider>;
};

export function useMediaLibraryStore() {
  const context = useContext(MediaLibraryContext);
  if (!context) {
    throw new Error('useMediaLibraryStore must be used within a MediaLibraryProvider');
  }
  return context;
}
