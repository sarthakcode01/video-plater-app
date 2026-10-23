export interface VideoAsset {
  id: string;
  uri: string;
  filename: string;
  duration: number; // in seconds
  width?: number;
  height?: number;
  modificationTime?: number;
  size?: number; // in bytes
  albumId?: string; // Folder/Album ID
  albumTitle?: string; // Folder name (e.g. Movies, Downloads)
  watchProgressPercent?: number; // 0 to 100 percentage watched
}

export interface VideoFolder {
  id: string;
  title: string;
  assetCount: number;
  previewUri?: string;
}

export type PlaybackSpeed = 1.0 | 1.25 | 1.5 | 1.75 | 2.0;
export type SortOption = 'date_desc' | 'date_asc' | 'title_asc' | 'duration_desc';
export type DurationFilterOption = 'all' | 'movies' | 'shorts'; // movies = >20m, shorts = <5m
export type LibraryViewMode = 'videos' | 'folders';

export interface AudioTrack {
  index: number;
  title: string;
  language: string;
  type?: string;
  selected?: boolean;
}

export interface TextTrack {
  index: number;
  title: string;
  language: string;
  type?: string;
  selected?: boolean;
}

export interface PlayerControlsState {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  baseSpeed: PlaybackSpeed;
  isSpeedBoosted: boolean; // active when user holds screen for 2.0x
  showControls: boolean;
  isFullscreen: boolean;
  selectedAudioTrackIndex: number | null;
  selectedTextTrackIndex: number | null; // null represents disabled/off
}
