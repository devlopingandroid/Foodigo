import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const TrendingItem = ({ item, onPlayVideo }) => {
  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: SIZES.radiusCard, overflow: 'hidden' }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.category}</Text>
            </View>
            <Text style={styles.calories}>{item.cal} kcal</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => onPlayVideo?.(item.name)}
        >
          <Ionicons name="play" size={20} color="#FF0000" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 80,
    borderRadius: SIZES.radiusCard,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: COLORS.cardBg,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  emoji: {
    fontSize: 32,
    marginRight: 15,
  },
  info: {
    flex: 1,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 10,
  },
  tagText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  calories: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  }
});

export default TrendingItem;
