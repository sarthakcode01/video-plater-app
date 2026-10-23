import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { VideoAsset } from '../types/video';
import { COLORS, SPACING } from '../constants/theme';
import { formatDuration } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

interface VideoCardProps {
  asset: VideoAsset;
  onPress: (asset: VideoAsset) => void;
  layout?: 'grid' | 'list';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - SPACING.md * 3) / 2;

export const VideoCard: React.FC<VideoCardProps> = ({ asset, onPress, layout = 'grid' }) => {
  // Extract resolution label (e.g., 4K, 1080p, 720p)
  const resolutionBadge = React.useMemo(() => {
    const minDim = Math.min(asset.width || 0, asset.height || 0);
    const maxDim = Math.max(asset.width || 0, asset.height || 0);

    if (maxDim >= 3840 || minDim >= 2160) return '4K';
    if (maxDim >= 2560 || minDim >= 1440) return '2K';
    if (maxDim >= 1920 || minDim >= 1080) return 'FHD';
    if (maxDim >= 1280 || minDim >= 720) return 'HD';
    return null;
  }, [asset.width, asset.height]);

  // Extract file extension (e.g., MKV, MP4)
  const extensionBadge = React.useMemo(() => {
    const parts = asset.filename.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toUpperCase();
    }
    return 'VIDEO';
  }, [asset.filename]);

  const hasProgress = (asset.watchProgressPercent || 0) > 0;

  if (layout === 'list') {
    return (
      <TouchableOpacity
        style={styles.listContainer}
        activeOpacity={0.7}
        onPress={() => onPress(asset)}
      >
        <View style={styles.listThumbnailContainer}>
          <Image source={{ uri: asset.uri }} style={styles.listThumbnail} resizeMode="cover" />
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(asset.duration)}</Text>
          </View>
          {hasProgress && (
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${asset.watchProgressPercent}%` },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.listInfoContainer}>
          <Text style={styles.listTitle} numberOfLines={2}>
            {asset.filename}
          </Text>
          <View style={styles.tagRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{extensionBadge}</Text>
            </View>
            {resolutionBadge && (
              <View style={styles.resolutionBadge}>
                <Text style={styles.resolutionBadgeText}>{resolutionBadge}</Text>
              </View>
            )}
            {hasProgress && (
              <Text style={styles.progressPercentText}>
                {asset.watchProgressPercent}% watched
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.gridContainer}
      activeOpacity={0.75}
      onPress={() => onPress(asset)}
    >
      <View style={styles.gridThumbnailContainer}>
        <Image source={{ uri: asset.uri }} style={styles.gridThumbnail} resizeMode="cover" />
        <View style={styles.playOverlay}>
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(asset.duration)}</Text>
        </View>
        {resolutionBadge && (
          <View style={styles.gridResolutionBadge}>
            <Text style={styles.gridResolutionText}>{resolutionBadge}</Text>
          </View>
        )}
        {hasProgress && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${asset.watchProgressPercent}%` },
              ]}
            />
          </View>
        )}
      </View>

      <View style={styles.gridInfoContainer}>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {asset.filename}
        </Text>
        <View style={styles.tagRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{extensionBadge}</Text>
          </View>
          {hasProgress && (
            <Text style={styles.progressPercentText}>
              {asset.watchProgressPercent}%
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Grid layout
  gridContainer: {
    width: GRID_ITEM_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridThumbnailContainer: {
    width: '100%',
    height: GRID_ITEM_WIDTH * 0.65,
    backgroundColor: COLORS.surfaceElevated,
    position: 'relative',
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 12, 16, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridResolutionBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridResolutionText: {
    color: COLORS.accentYellow,
    fontSize: 10,
    fontWeight: '700',
  },
  gridInfoContainer: {
    padding: SPACING.sm,
  },
  gridTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 6,
  },

  // List layout
  listContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  listThumbnailContainer: {
    width: 120,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceElevated,
    position: 'relative',
  },
  listThumbnail: {
    width: '100%',
    height: '100%',
  },
  listInfoContainer: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  listTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 6,
  },

  // Shared elements
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressPercentText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  resolutionBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resolutionBadgeText: {
    color: COLORS.accentYellow,
    fontSize: 10,
    fontWeight: '700',
  },
});
