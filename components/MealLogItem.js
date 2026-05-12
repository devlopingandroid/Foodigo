import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Image as RNImage 
} from 'react-native';
import { Image } from 'expo-image';
import { COLORS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

/**
 * MealLogItem Component
 * 
 * Renders an individual meal log entry with a glassmorphism effect.
 * Optimized for Android to prevent "Hardware Bitmap" crashes.
 */
const MealLogItem = ({ meal, onDelete }) => {
  // Defensive check for meal data
  if (!meal) return null;

  return (
    <View style={styles.container}>
      {/* 1. Android-safe Background Blur Layer */}
      <View style={styles.blurWrapper}>
        {Platform.OS === 'ios' ? (
          <BlurView 
            intensity={20} 
            tint="light" 
            style={StyleSheet.absoluteFill} 
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
        )}
      </View>

      {/* 2. Content Layer */}
      <View style={styles.content}>
        {/* Support for both emoji and image-based icons */}
        <View style={styles.iconContainer}>
          {meal.image ? (
            <Image 
              source={meal.image} 
              style={styles.mealImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Text style={styles.emoji}>{meal.emoji || '🥗'}</Text>
          )}
        </View>
        
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{meal.name}</Text>
          <Text style={styles.meta}>
            {meal.type} • {meal.time}
          </Text>
        </View>

        <View style={styles.rightSide}>
          <Text style={styles.calories}>{meal.calories} cal</Text>
          <TouchableOpacity 
            onPress={() => onDelete && onDelete(meal.id)} 
            style={styles.deleteBtn}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle-outline" size={22} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 80,
  },
  blurWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  emoji: {
    fontSize: 28,
  },
  mealImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  meta: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calories: {
    color: COLORS.accent || '#F5A623',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
  },
  deleteBtn: {
    padding: 2,
  }
});

export default MealLogItem;
