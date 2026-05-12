import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import CategoryPill from '../components/CategoryPill';
import RecipeCard from '../components/RecipeCard';
import TrendingItem from '../components/TrendingItem';
import { GROQ_API_KEY } from '../constants/config';
import { COLORS, SHADOWS, SIZES } from '../constants/theme';

const RECIPES_DATA = [
  // BULKING
  { id: 1, name: "Mass Gainer Beef Bowl", emoji: "🥩", cal: 850, time: "30 min", category: "Bulking", protein: 65, carbs: 80, fat: 28, tag: 'Non-Veg' },
  { id: 5, name: "Paneer Protein Feast", emoji: "🧀", cal: 720, time: "25 min", category: "Bulking", protein: 45, carbs: 50, fat: 35, tag: 'Veg' },
  { id: 9, name: "Sweet Potato Chickpea Curry", emoji: "🍛", cal: 680, time: "35 min", category: "Bulking", protein: 28, carbs: 95, fat: 18, tag: 'Veg' },

  // DIETING
  { id: 4, name: "Shredded Zucchini Bowl", emoji: "🥗", cal: 210, time: "15 min", category: "Dieting", protein: 18, carbs: 12, fat: 8, tag: 'Veg' },
  { id: 8, name: "Lean Lemon Fish", emoji: "🐟", cal: 280, time: "20 min", category: "Dieting", protein: 35, carbs: 5, fat: 12, tag: 'Non-Veg' },
  { id: 10, name: "Spinach & Tofu Scramble", emoji: "🥘", cal: 240, time: "12 min", category: "Dieting", protein: 22, carbs: 8, fat: 14, tag: 'Veg' },
  { id: 13, name: "Cucumber Avocado Salad", emoji: "🥒", cal: 190, time: "8 min", category: "Dieting", protein: 5, carbs: 12, fat: 15, tag: 'Veg' },

  // SPICY
  { id: 3, name: "Volcano Chili Ramen", emoji: "🍜", cal: 560, time: "30 min", category: "Spicy", protein: 22, carbs: 68, fat: 18, tag: 'Veg' },
  { id: 11, name: "Spicy Masala Paneer", emoji: "🍢", cal: 420, time: "20 min", category: "Spicy", protein: 24, carbs: 15, fat: 28, tag: 'Veg' },
  { id: 14, name: "Peri Peri Roasted Corn", emoji: "🌽", cal: 310, time: "15 min", category: "Spicy", protein: 8, carbs: 45, fat: 12, tag: 'Veg' },

  // SWEET
  { id: 2, name: "Protein Berry Parfait", emoji: "🍧", cal: 320, time: "5 min", category: "Sweet", protein: 25, carbs: 35, fat: 6, tag: 'Veg' },
  { id: 6, name: "Chia Choco Pudding", emoji: "🍮", cal: 240, time: "10 min", category: "Sweet", protein: 12, carbs: 28, fat: 10, tag: 'Veg' },

  // HEALTHY
  { id: 7, name: "Quinoa Shakti Bowl", emoji: "🍲", cal: 410, time: "25 min", category: "Healthy", protein: 20, carbs: 55, fat: 14, tag: 'Veg' },
  { id: 12, name: "Avocado Garden Wrap", emoji: "🌯", cal: 380, time: "12 min", category: "Healthy", protein: 14, carbs: 42, fat: 18, tag: 'Veg' },
  { id: 15, name: "Roasted Turmeric Gobi", emoji: "🥦", cal: 260, time: "22 min", category: "Healthy", protein: 10, carbs: 30, fat: 12, tag: 'Veg' },
];

// Map from pill label → data category string (safe, no string splitting)
const CATEGORY_MAP = {
  "All": null,
  "Bulking 💪": "Bulking",
  "Dieting 🥗": "Dieting",
  "Spicy 🌶️": "Spicy",
  "Sweet 🍰": "Sweet",
  "Healthy 🥦": "Healthy",
};
const CATEGORIES = Object.keys(CATEGORY_MAP);

const GrokRecipeDetail = ({ recipe }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recipe) return;
    fetchDetails();
  }, [recipe]);

  const fetchDetails = async () => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'Recipe expert. JSON only. No markdown, no backticks.'
            },
            {
              role: 'user',
              content: `Give ingredients and steps for "${recipe.name}".
              JSON format only:
              {
                "ingredients": ["item 1", "item 2", "item 3"],
                "steps": ["Step 1 detail", "Step 2 detail", "Step 3 detail"]
              }`
            }
          ],
          max_tokens: 600,
          temperature: 0.5
        })
      });
      const data = await response.json();
      const content = data.choices[0].message.content;
      const clean = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setDetails(parsed);
    } catch (e) {
      console.log('Detail fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={{ alignItems: 'center', padding: 20 }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 10 }}>
        Fetching recipe details...
      </Text>
    </View>
  );

  return (
    <View>
      {details?.ingredients && (
        <View style={styles.modalSection}>
          <Text style={styles.modalSectionTitle}>🧂 Ingredients</Text>
          {details.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}
        </View>
      )}
      {details?.steps && (
        <View style={styles.modalSection}>
          <Text style={styles.modalSectionTitle}>👨‍🍳 How to Make</Text>
          {details.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const HomeScreen = ({ onRecipeSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiRecipes, setAiRecipes] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [vegFilter, setVegFilter] = useState('All');
  const searchTimeout = useRef(null);

  const openYouTubeRecipe = (recipeName) => {
    if (!recipeName) return;
    const query = encodeURIComponent(`${recipeName} recipe`);
    const url = `https://www.youtube.com/results?search_query=${query}`;
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon ☀️";
    if (hour < 21) return "Good Evening 🌆";
    return "Good Night 🌙";
  };

  const handleSearch = async (text, currentVegFilter) => {
    setSearchQuery(text);
    const dietPref = currentVegFilter || vegFilter;

    if (text.trim().length < 3) {
      setAiRecipes([]);
      return;
    }

    const localMatch = RECIPES_DATA.filter(r =>
      r.name.toLowerCase().includes(text.toLowerCase())
    );

    if (localMatch.length > 0) {
      setAiRecipes([]);
      return;
    }

    setIsSearching(true);

    try {
      console.log('=== GROQ API CALL START ===');
      const dietPrompt = dietPref === 'All' ? '' : `Respond ONLY with ${dietPref} recipes.`;

      const requestBody = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a recipe expert. Respond ONLY with JSON. ${dietPrompt}`
          },
          {
            role: 'user',
            content: `Search recipes for "${text}". Respond in this JSON format only: 
            {
              "recipes": [
                {"id": 101, "name": "Recipe Name", "emoji": "🍱", "cal": 350, "time": "20 min", "category": "Healthy", "tag": "Veg"},
                ...max 8 recipes
              ]
            }`
          }
        ],
        max_tokens: 1000,
        temperature: 0.5
      };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      const rawText = await response.text();
      if (!response.ok) {
        setAiRecipes([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        setAiRecipes([]);
        return;
      }

      const content = data.choices[0]?.message?.content;
      if (!content) {
        setAiRecipes([]);
        return;
      }

      let clean = content.replace(/```json|```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch (e) {
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            setAiRecipes([]);
            return;
          }
        } else {
          setAiRecipes([]);
          return;
        }
      }

      if (parsed.recipes && Array.isArray(parsed.recipes)) {
        setAiRecipes(parsed.recipes);
      } else {
        setAiRecipes([]);
      }

    } catch (e) {
      console.log('Error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRecipePress = (recipe) => {
    console.log('Recipe pressed:', recipe.name);
    setSelectedRecipe(recipe);
    setModalVisible(true);
  };

  const displayRecipes = useMemo(() => {
    // AI search results override everything
    if (searchQuery.trim().length >= 3 && aiRecipes.length > 0) {
      return aiRecipes;
    }

    let results = RECIPES_DATA;

    // Category filter — use CATEGORY_MAP for safe lookup
    const categoryFilter = CATEGORY_MAP[selectedCategory];
    if (categoryFilter) {
      results = results.filter(r => r.category === categoryFilter);
    }

    // Veg/Non-Veg filter
    if (vegFilter === 'Veg') {
      results = results.filter(r => r.tag === 'Veg');
    } else if (vegFilter === 'Non-Veg') {
      results = results.filter(r => r.tag === 'Non-Veg');
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(q));
    }

    return results;
  }, [searchQuery, selectedCategory, aiRecipes, vegFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        // ── Smooth scrolling ──────────────────────────────────────────────
        decelerationRate="normal"          // natural momentum feel
        scrollEventThrottle={16}           // 60 fps scroll events
        overScrollMode="never"             // removes Android overscroll jank
      >

        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(500).springify().damping(18)}
          style={styles.header}
        >
          <View>
            <Text style={styles.subtitle}>{getGreeting()}</Text>
            <Text style={styles.title}>What are you{"\n"}cooking today?</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.65}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} activeOpacity={0.65}>
              <Text style={styles.avatarEmoji}>👨‍🍳</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(500).springify().damping(18)}
          style={styles.searchContainer}
        >
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
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (searchTimeout.current) clearTimeout(searchTimeout.current);
                  // ── Reduced debounce from 800 ms → 500 ms for snappier feel ──
                  searchTimeout.current = setTimeout(() => handleSearch(text), 500);
                }}
              />
              {isSearching && <ActivityIndicator size="small" color={COLORS.accent} />}
            </View>
          </View>
        </Animated.View>

        {/* Veg/Non-Veg Filter */}
        <Animated.View
          entering={FadeInDown.delay(140).duration(500).springify().damping(18)}
          style={styles.vegFilterRow}
        >
          {['All', 'Veg', 'Non-Veg'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.vegPill, vegFilter === type && styles.vegPillSelected]}
              activeOpacity={0.7}
              onPress={() => {
                setVegFilter(type);
                if (searchQuery.length >= 3) handleSearch(searchQuery, type);
              }}
            >
              <Text style={[styles.vegPillText, vegFilter === type && styles.vegPillTextSelected]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Hero Banner */}
        <Animated.View
          entering={FadeInDown.delay(180).duration(500).springify().damping(18)}
        >
          <TouchableOpacity style={styles.heroContainer} activeOpacity={0.88}>
            <LinearGradient
              colors={[COLORS.accent, COLORS.secondaryAccent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroTitle}>Explore Healthy &{"\n"}Tasty Food 🍜</Text>
                  <Text style={styles.heroSubtitle}>500+ recipes available</Text>
                </View>
                <Text style={styles.heroEmoji}>🥗</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Category Pills */}
        <Animated.View
          entering={FadeInDown.delay(240).duration(500).springify().damping(18)}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
            // ── Snappy pill scrolling ──────────────────────────────────────
            decelerationRate="fast"
            overScrollMode="never"
          >
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat}
                category={cat}
                isSelected={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Recommended Section */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500).springify().damping(18)}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={displayRecipes}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.delay(340 + index * 60).duration(400).springify().damping(16)}
              >
                <TouchableOpacity onPress={() => handleRecipePress(item)} activeOpacity={0.82}>
                  <RecipeCard
                    item={item}
                    onPlayVideo={openYouTubeRecipe}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}
            contentContainerStyle={styles.recipesList}
            // ── Smooth horizontal card scrolling ──────────────────────────
            decelerationRate="fast"
            snapToAlignment="start"
            removeClippedSubviews={true}
            overScrollMode="never"
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
          />
        </Animated.View>

        {/* Trending Section */}
        <Animated.View
          entering={FadeInDown.delay(420).duration(500).springify().damping(18)}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Recipes</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trendingContainer}>
            {displayRecipes.slice(0, 3).map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(460 + index * 70).duration(400).springify().damping(16)}
              >
                <TouchableOpacity onPress={() => handleRecipePress(item)} activeOpacity={0.82}>
                  <TrendingItem
                    item={item}
                    onPlayVideo={openYouTubeRecipe}
                  />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Recipe Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        // ── Faster modal presentation ──────────────────────────────────────
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRecipe && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle} numberOfLines={1}>{selectedRecipe.name}</Text>
                  <TouchableOpacity style={styles.heartButton} activeOpacity={0.7}>
                    <Ionicons name="heart-outline" size={24} color="white" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  decelerationRate="normal"
                  scrollEventThrottle={16}
                  overScrollMode="never"
                >
                  <View style={styles.modalHero}>
                    <Text style={styles.modalEmoji}>{selectedRecipe.emoji}</Text>
                    <View style={styles.modalStats}>
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatVal}>{selectedRecipe.cal}</Text>
                        <Text style={styles.modalStatLab}>Calories</Text>
                      </View>
                      <View style={styles.modalStatDivider} />
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatVal}>{selectedRecipe.time}</Text>
                        <Text style={styles.modalStatLab}>Cook Time</Text>
                      </View>
                    </View>
                  </View>

                  <GrokRecipeDetail recipe={selectedRecipe} />

                  {/* YouTube Button */}
                  <TouchableOpacity
                    style={styles.youtubeButton}
                    onPress={() => openYouTubeRecipe(selectedRecipe.name)}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="logo-youtube" size={20} color="white" />
                    <Text style={styles.youtubeButtonText}>
                      Watch on YouTube
                    </Text>
                  </TouchableOpacity>

                  <View style={{ height: 50 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  searchWrapper: {
    height: 55,
    borderRadius: 27.5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 55,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
  },
  heroContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  heroGradient: {
    borderRadius: SIZES.radiusBanner,
    padding: 20,
    height: 140,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 8,
  },
  heroEmoji: {
    fontSize: 60,
  },
  categoriesContainer: {
    marginTop: 25,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 15,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  recipesList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  trendingContainer: {
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHero: {
    alignItems: 'center',
    marginVertical: 20,
  },
  modalEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 15,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatVal: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalStatLab: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  modalStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalSection: {
    marginTop: 25,
  },
  modalSectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F5A623',
    marginRight: 10,
  },
  ingredientText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5A623',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 21,
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 20,
    gap: 8,
    ...SHADOWS.medium,
  },
  youtubeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  vegFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  vegPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  vegPillSelected: {
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',
  },
  vegPillText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  vegPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default HomeScreen;