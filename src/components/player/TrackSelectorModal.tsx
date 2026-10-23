import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioTrack, TextTrack } from '../../types/video';
import { COLORS, SPACING } from '../../constants/theme';
import { formatTrackLabel } from '../../utils/formatters';

interface TrackSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  audioTracks: AudioTrack[];
  textTracks: TextTrack[];
  selectedAudioIndex: number | null;
  selectedTextIndex: number | null;
  onSelectAudio: (index: number) => void;
  onSelectSubtitle: (index: number | null) => void;
  initialTab?: 'audio' | 'subtitles';
}

export const TrackSelectorModal: React.FC<TrackSelectorModalProps> = ({
  visible,
  onClose,
  audioTracks,
  textTracks,
  selectedAudioIndex,
  selectedTextIndex,
  onSelectAudio,
  onSelectSubtitle,
  initialTab = 'audio',
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'subtitles'>(initialTab);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.sheetTitle}>Audio &amp; Subtitles</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'audio' && styles.activeTab]}
              onPress={() => setActiveTab('audio')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="volume-high-outline"
                size={18}
                color={activeTab === 'audio' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'audio' && styles.activeTabText,
                ]}
              >
                Audio ({audioTracks.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'subtitles' && styles.activeTab]}
              onPress={() => setActiveTab('subtitles')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chatbox-ellipses-outline"
                size={18}
                color={activeTab === 'subtitles' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'subtitles' && styles.activeTabText,
                ]}
              >
                Subtitles ({textTracks.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* List Content */}
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
            {activeTab === 'audio' ? (
              audioTracks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Default audio track active</Text>
                </View>
              ) : (
                audioTracks.map((track) => {
                  const isSelected = selectedAudioIndex === track.index;
                  return (
                    <TouchableOpacity
                      key={`audio-${track.index}`}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => {
                        onSelectAudio(track.index);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.trackInfo}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}
                        >
                          {formatTrackLabel(track, 'Audio')}
                        </Text>
                        {track.language ? (
                          <Text style={styles.optionSub}>Code: {track.language.toUpperCase()}</Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )
            ) : (
              <>
                {/* Off / Disabled Subtitles Option */}
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedTextIndex === null && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    onSelectSubtitle(null);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.trackInfo}>
                    <Text
                      style={[
                        styles.optionLabel,
                        selectedTextIndex === null && styles.optionLabelSelected,
                      ]}
                    >
                      Off / Disabled
                    </Text>
                    <Text style={styles.optionSub}>Do not display subtitles</Text>
                  </View>
                  {selectedTextIndex === null && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>

                {/* Detected Embedded Subtitle Tracks */}
                {textTracks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No embedded subtitle tracks detected</Text>
                  </View>
                ) : (
                  textTracks.map((track) => {
                    const isSelected = selectedTextIndex === track.index;
                    return (
                      <TouchableOpacity
                        key={`text-${track.index}`}
                        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                        onPress={() => {
                          onSelectSubtitle(track.index);
                          onClose();
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.trackInfo}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}
                          >
                            {formatTrackLabel(track, 'Subtitle')}
                          </Text>
                          {track.language ? (
                            <Text style={styles.optionSub}>Code: {track.language.toUpperCase()}</Text>
                          ) : null}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '65%',
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  scrollList: {
    paddingHorizontal: SPACING.lg,
  },
  scrollContent: {
    paddingVertical: SPACING.xs,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: COLORS.surface,
  },
  optionItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  trackInfo: {
    flex: 1,
  },
  optionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  optionSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
