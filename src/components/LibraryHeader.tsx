import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SortOption, DurationFilterOption, LibraryViewMode } from '../types/video';

interface LibraryHeaderProps {
  totalCount: number;
  filteredCount: number;
  selectedFolderName: string;
  isFolderSelected: boolean;
  onClearFolder: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  layout: 'grid' | 'list';
  onToggleLayout: () => void;
  viewMode: LibraryViewMode;
  onToggleViewMode: () => void;
  sortBy: SortOption;
  onChangeSort: (option: SortOption) => void;
  durationFilter: DurationFilterOption;
  onChangeDurationFilter: (filter: DurationFilterOption) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const LibraryHeader: React.FC<LibraryHeaderProps> = ({
  totalCount,
  filteredCount,
  selectedFolderName,
  isFolderSelected,
  onClearFolder,
  searchQuery,
  onSearchChange,
  layout,
  onToggleLayout,
  viewMode,
  onToggleViewMode,
  sortBy,
  onChangeSort,
  durationFilter,
  onChangeDurationFilter,
  isRefreshing,
  onRefresh,
}) => {
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  const sortLabels: Record<SortOption, string> = {
    duration_desc: 'Duration (Longest First)',
    date_desc: 'Newest First',
    date_asc: 'Oldest First',
    title_asc: 'Name (A-Z)',
  };

  const durationLabels: Record<DurationFilterOption, string> = {
    all: 'All Lengths',
    movies: 'Movies only (>20m)',
    shorts: 'Short clips (<5m)',
  };

  return (
    <View style={styles.container}>
      {/* Top Title & Actions Row */}
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          {isFolderSelected ? (
            <TouchableOpacity style={styles.breadcrumb} onPress={onClearFolder} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
              <Text style={styles.breadcrumbText}>{selectedFolderName}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.title}>Media Library</Text>
          )}
          <Text style={styles.subtitle}>
            {filteredCount} {filteredCount === 1 ? 'video' : 'videos'}
            {filteredCount !== totalCount ? ` of ${totalCount}` : ''}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          {/* Explicit Refresh Button (diffs and checks for new files) */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="refresh" size={19} color={COLORS.text} />
            )}
          </TouchableOpacity>

          {/* View Mode Toggle: Folders View vs Videos View */}
          <TouchableOpacity
            style={[styles.iconButton, viewMode === 'folders' && styles.iconButtonActive]}
            onPress={onToggleViewMode}
            activeOpacity={0.7}
          >
            <Ionicons
              name={viewMode === 'folders' ? 'folder' : 'folder-outline'}
              size={19}
              color={viewMode === 'folders' ? COLORS.primary : COLORS.text}
            />
          </TouchableOpacity>

          {/* Filter & Sort Dialog button */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              (sortBy !== 'date_desc' || durationFilter !== 'all') && styles.iconButtonActive,
            ]}
            onPress={() => setShowFilterModal(!showFilterModal)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="filter"
              size={19}
              color={sortBy !== 'date_desc' || durationFilter !== 'all' ? COLORS.primary : COLORS.text}
            />
          </TouchableOpacity>

          {/* Grid vs List toggle (only in videos view) */}
          {viewMode === 'videos' && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onToggleLayout}
              activeOpacity={0.7}
            >
              <Ionicons
                name={layout === 'grid' ? 'list-outline' : 'grid-outline'}
                size={19}
                color={COLORS.text}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search movie or video title..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter & Sort Popover */}
      {showFilterModal && (
        <View style={styles.filterMenu}>
          {/* Duration Filter Section */}
          <Text style={styles.menuSectionHeader}>DURATION FILTER</Text>
          <View style={styles.durationRow}>
            {(Object.keys(durationLabels) as DurationFilterOption[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.durationChip,
                  durationFilter === filter && styles.durationChipActive,
                ]}
                onPress={() => onChangeDurationFilter(filter)}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    durationFilter === filter && styles.durationChipTextActive,
                  ]}
                >
                  {durationLabels[filter]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort By Section */}
          <Text style={[styles.menuSectionHeader, { marginTop: 12 }]}>SORT VIDEOS BY</Text>
          {(Object.keys(sortLabels) as SortOption[]).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.sortOption,
                sortBy === option && styles.sortOptionActive,
              ]}
              onPress={() => {
                onChangeSort(option);
                setShowFilterModal(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option && styles.sortOptionTextActive,
                ]}
              >
                {sortLabels[option]}
              </Text>
              {sortBy === option && (
                <Ionicons name="checkmark" size={16} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breadcrumbText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 40,
    marginBottom: SPACING.xs,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  filterMenu: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  menuSectionHeader: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  durationChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: COLORS.primary,
  },
  durationChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  durationChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  sortOptionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
