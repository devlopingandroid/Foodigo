import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  Layout, 
  SlideInRight 
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import CategoryPill from '../components/CategoryPill';
import SkeletonCard from '../components/SkeletonCard';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - SIZES.padding * 3) / 2;

// --- Mock Data ---
const ALL_RECIPES = [
  // Healthy / Indian
  { id: 1, name: "Paneer Tikka Salad", emoji: "🥗", cal: 320, time: "20 min", category: "Healthy", isVeg: true, rating: 4.8, difficulty: "Easy", protein: 18, carbs: 12, fiber: 5 },
  { id: 2, name: "Chicken Biryani", emoji: "🍗", cal: 580, time: "45 min", category: "Indian", isVeg: false, rating: 4.9, difficulty: "Medium", protein: 35, carbs: 65, fiber: 3 },
  { id: 3, name: "Dal Makhani", emoji: "🍲", cal: 420, time: "60 min", category: "Indian", isVeg: true, rating: 4.7, difficulty: "Hard", protein: 15, carbs: 45, fiber: 8 },
  { id: 4, name: "Quinoa Pulao", emoji: "🥣", cal: 280, time: "15 min", category: "Dieting", isVeg: true, rating: 4.5, difficulty: "Easy", protein: 12, carbs: 38, fiber: 7 },
  
  // Fast Food / Hearty
  { id: 5, name: "Veggie Burger", emoji: "🍔", cal: 450, time: "20 min", category: "Fast Food", isVeg: true, rating: 4.6, difficulty: "Medium", protein: 14, carbs: 55, fiber: 6 },
  { id: 6, name: "Grilled Salmon", emoji: "🐟", cal: 380, time: "25 min", category: "Healthy", isVeg: false, rating: 4.9, difficulty: "Medium", protein: 42, carbs: 5, fiber: 0 },
  { id: 7, name: "Pepperoni Pizza", emoji: "🍕", cal: 850, time: "30 min", category: "Fast Food", isVeg: false, rating: 4.7, difficulty: "Medium", protein: 28, carbs: 90, fiber: 4 },
  
  // Desserts
  { id: 8, name: "Mango Sorbet", emoji: "🍧", cal: 150, time: "10 min", category: "Dessert", isVeg: true, rating: 4.8, difficulty: "Easy", protein: 2, carbs: 35, fiber: 2 },
  { id: 9, name: "Dark Choco Brownie", emoji: "🍫", cal: 320, time: "40 min", category: "Dessert", isVeg: true, rating: 4.9, difficulty: "Hard", protein: 6, carbs: 40, fiber: 3 },
  
  // Indian / Veg
  { id: 10, name: "Masala Dosa", emoji: "🌯", cal: 310, time: "20 min", category: "Indian", isVeg: true, rating: 4.8, difficulty: "Medium", protein: 8, carbs: 52, fiber: 4 },
  { id: 11, name: "Butter Chicken", emoji: "🥘", cal: 620, time: "45 min", category: "Indian", isVeg: false, rating: 4.9, difficulty: "Medium", protein: 40, carbs: 15, fiber: 2 },
  
  // Bulking / High Protein
  { id: 12, name: "Steak & Potatoes", emoji: "🥩", cal: 720, time: "35 min", category: "Bulking", isVeg: false, rating: 4.8, difficulty: "Medium", protein: 55, carbs: 40, fiber: 5 },
  { id: 13, name: "Egg & Avocado Salad", emoji: "🥚", cal: 340, time: "12 min", category: "Healthy", isVeg: false, rating: 4.6, difficulty: "Easy", protein: 22, carbs: 8, fiber: 6 },
  { id: 14, name: "Tofu Stir Fry", emoji: "🥢", cal: 290, time: "15 min", category: "Healthy", isVeg: true, rating: 4.5, difficulty: "Easy", protein: 25, carbs: 12, fiber: 4 },
  
  // New Additions
  { id: 15, name: "Spicy Ramen", emoji: "🍜", cal: 560, time: "25 min", category: "Fast Food", isVeg: false, rating: 4.7, difficulty: "Medium", protein: 20, carbs: 70, fiber: 4 },
  { id: 16, name: "Keto Salad bowl", emoji: "🥗", cal: 410, time: "10 min", category: "Dieting", isVeg: true, rating: 4.6, difficulty: "Easy", protein: 12, carbs: 8, fiber: 9 },
];

const CATEGORIES = ["All", "Indian", "Healthy", "Fast Food", "Dessert", "Bulking", "Dieting"];

const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular', icon: 'flame-outline' },
  { id: 'calories_low', label: 'Low Cal', icon: 'leaf-outline' },
  { id: 'time_fast', label: 'Quickest', icon: 'time-outline' },
  { id: 'rating', label: 'Top Rated', icon: 'star-outline' },
];

// --- Sub-Components ---

const ExploreRecipeCard = ({ item, onPress }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.cardContainer}>
      {/* Android-safe Background */}
      <View style={styles.cardWrapper}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(25, 60, 55, 0.95)' }]} />
        )}
        
        {/* Favorite Button */}
        <TouchableOpacity 
          style={styles.favoriteBtn}
          onPress={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
        >
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={20} 
            color={isFavorite ? COLORS.accent : "white"} 
          />
        </TouchableOpacity>

        {/* Image / Emoji Area */}
        <View style={styles.imageArea}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
          <View style={[styles.dietBadge, { backgroundColor: item.isVeg ? '#4CAF50' : '#FF5252' }]}>
            <Text style={styles.dietBadgeText}>{item.isVeg ? 'VEG' : 'NON-VEG'}</Text>
          </View>
        </View>

        {/* Info Area */}
        <View style={styles.infoArea}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={COLORS.accent} />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.difficultyText}>• {item.difficulty}</Text>
          </View>

          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={12} color={COLORS.accent} />
              <Text style={styles.metaText}>{item.cal} cal</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{item.time.split(' ')[0]}m</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// --- Main Screen ---

const ExploreScreen = ({ onRecipeSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [vegOnly, setVegOnly] = useState(false);
  const [sortBy, setSortBy] = useState("popular");
  const [isLoading, setIsLoading] = useState(true);

  // Initial Load Simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Filtering Logic
  const filteredRecipes = useMemo(() => {
    let result = ALL_RECIPES.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || recipe.category === selectedCategory;
      const matchesVeg = !vegOnly || recipe.isVeg === true;
      return matchesSearch && matchesCategory && matchesVeg;
    });

    // Sorting
    switch(sortBy) {
      case 'calories_low': result.sort((a, b) => a.cal - b.cal); break;
      case 'time_fast': result.sort((a, b) => parseInt(a.time) - parseInt(b.time)); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'popular': default: result.sort((a, b) => b.protein - a.protein); break;
    }

    return result;
  }, [searchQuery, selectedCategory, vegOnly, sortBy]);

  const handleClearSearch = useCallback(() => setSearchQuery(""), []);

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Animated.View entering={FadeInUp.duration(600)}>
        <Text style={styles.title}>Explore Recipes 🔍</Text>
        <Text style={styles.subtitle}>Discover healthy & delicious meals</Text>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={25} tint="light" style={styles.searchBlur} />
          ) : (
            <View style={[styles.searchBlur, { backgroundColor: 'rgba(255, 255, 255, 0.12)' }]} />
          )}
          <View style={styles.searchContent}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput 
              placeholder="Search recipes, ingredients..." 
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Categories & Dietary Toggle */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map(cat => (
            <CategoryPill 
              key={cat}
              category={cat}
              isSelected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>
        
        <TouchableOpacity 
          style={[styles.vegToggle, vegOnly && styles.vegToggleActive]}
          onPress={() => setVegOnly(!vegOnly)}
        >
          <Ionicons name="leaf" size={16} color={vegOnly ? 'white' : COLORS.textSecondary} />
          <Text style={[styles.vegToggleText, vegOnly && styles.vegToggleTextActive]}>Veg Only</Text>
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.sortSection}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity 
            key={opt.id}
            style={[styles.sortChip, sortBy === opt.id && styles.sortChipActive]}
            onPress={() => setSortBy(opt.id)}
          >
            <Ionicons name={opt.icon} size={14} color={sortBy === opt.id ? 'white' : COLORS.textSecondary} />
            <Text style={[styles.sortChipText, sortBy === opt.id && styles.sortChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🍽️</Text>
      <Text style={styles.emptyTitle}>No matching recipes</Text>
      <Text style={styles.emptySubtitle}>Try adjusting your filters or search terms</Text>
      <TouchableOpacity 
        style={styles.resetBtn} 
        onPress={() => {
          setSearchQuery("");
          setSelectedCategory("All");
          setVegOnly(false);
        }}
      >
        <Text style={styles.resetBtnText}>Clear All Filters</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Fetching delicious recipes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item, index }) => (
            <Animated.View 
              entering={FadeInUp.delay(index * 60).duration(400)}
              layout={Layout.springify()}
            >
              <ExploreRecipeCard item={item} onPress={() => onRecipeSelect(item)} />
            </Animated.View>
          )}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true} // Performance optimization
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 15,
    fontSize: 16,
    opacity: 0.7,
  },
  headerSection: {
    paddingTop: 20,
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    paddingHorizontal: SIZES.padding,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    paddingHorizontal: SIZES.padding,
    marginTop: 5,
  },
  searchContainer: {
    marginTop: 25,
    paddingHorizontal: SIZES.padding,
  },
  searchWrapper: {
    height: 55,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
  },
  filterRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryList: {
    paddingLeft: SIZES.padding,
    paddingRight: 10,
  },
  vegToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: SIZES.padding,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  vegToggleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  vegToggleText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  vegToggleTextActive: {
    color: 'white',
  },
  sortSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIZES.padding,
    marginTop: 15,
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sortChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  sortChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  sortChipTextActive: {
    color: 'white',
  },
  listContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    paddingHorizontal: SIZES.padding,
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: COLUMN_WIDTH,
    marginBottom: SIZES.padding,
  },
  cardWrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: 12,
  },
  imageArea: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardEmoji: {
    fontSize: 60,
  },
  dietBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dietBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  infoArea: {
    padding: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  difficultyText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginLeft: 4,
  },
  cardName: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  resetBtn: {
    marginTop: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
  },
  resetBtnText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default ExploreScreen;
