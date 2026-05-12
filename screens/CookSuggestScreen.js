import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Modal,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { callGroqAPI } from '../utils/api';
import Animated, { FadeInUp, FadeIn, Layout, SlideInDown } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const COOK_CATEGORIES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { id: 'lunch',     label: 'Lunch',     emoji: '🍱' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🍽️' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🥪' },
  { id: 'healthy',   label: 'Healthy',   emoji: '🥗' },
  { id: 'protein',   label: 'High Protein', emoji: '💪' },
  { id: 'veg',       label: 'Veg',       emoji: '🥦' },
  { id: 'non-veg',   label: 'Non-Veg',   emoji: '🍗' },
  { id: 'vegan',     label: 'Vegan',     emoji: '🌱' },
  { id: 'quick',     label: 'Quick Meals', emoji: '⚡' },
  { id: 'indian',    label: 'Indian',    emoji: '🇮🇳' },
  { id: 'gym',       label: 'Gym Meals', emoji: '🏋️' },
];

const QUICK_INGREDIENTS = [
  'onion', 'tomato', 'paneer', 'egg', 'rice', 'chicken', 'milk', 'bread', 'potato', 'garlic', 'ginger', 'chilli'
];

const getDiffColor = (diff) => {
  const d = (diff || '').toLowerCase();
  if (d.includes('easy')) return '#4CAF50';
  if (d.includes('medium')) return '#F5A623';
  if (d.includes('hard')) return '#FF5252';
  return COLORS.accent;
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

const RecipeCard = ({ recipe, onPress }) => (
  <Animated.View entering={FadeInUp.duration(400)} layout={Layout.springify()}>
    <TouchableOpacity style={s.recipeCard} onPress={onPress} activeOpacity={0.9}>
      <View style={s.cardEmojiBg}>
        <Text style={s.cardEmoji}>{recipe.emoji || '🥘'}</Text>
      </View>
      <View style={s.cardInfo}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle} numberOfLines={1}>{recipe.name}</Text>
          <View style={[s.typeBadge, { backgroundColor: recipe.isVeg ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 82, 82, 0.15)' }]}>
            <View style={[s.typeDot, { backgroundColor: recipe.isVeg ? '#4CAF50' : '#FF5252' }]} />
          </View>
        </View>
        <Text style={s.cardMeta}>{recipe.calories} kcal • {recipe.prepTime}</Text>
        <View style={s.cardStats}>
          <View style={[s.diffBadge, { backgroundColor: getDiffColor(recipe.difficulty) }]}>
            <Text style={s.diffText}>{recipe.difficulty}</Text>
          </View>
          <Text style={s.proteinText}>{recipe.protein}g Protein</Text>
        </View>
        {recipe.missingIngredientSuggestion && (
          <View style={s.smartTip}>
            <Ionicons name="bulb-outline" size={12} color={COLORS.accent} />
            <Text style={s.smartTipText} numberOfLines={1}>{recipe.missingIngredientSuggestion}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  </Animated.View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const CookSuggestScreen = () => {
  const [selectedCat, setSelectedCat] = useState('indian');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const addIngredient = (ing) => {
    const val = (ing || ingredientInput).trim().toLowerCase();
    if (val && !ingredients.includes(val)) {
      setIngredients([...ingredients, val]);
      setIngredientInput('');
    }
  };

  const removeIngredient = (ing) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const findRecipes = async () => {
    if (ingredients.length === 0 || loading) return;
    setLoading(true);
    setSearched(true);
    
    try {
      const groqMessages = [
        { 
          role: "system", 
          content: "You are an expert Indian Home Chef. Suggest realistic recipes based on available ingredients. Respond ONLY with JSON. No text before or after JSON." 
        },
        { 
          role: "user", 
          content: `Available ingredients: ${ingredients.join(', ')}. Category: ${selectedCat}.
          Generate 3-4 realistic Indian recipes.
          
          JSON Format:
          {
            "recipes": [
              {
                "name": "Recipe Name",
                "emoji": "🥘",
                "calories": 450,
                "protein": 15,
                "carbs": 50,
                "fats": 12,
                "prepTime": "20 min",
                "difficulty": "Easy",
                "isVeg": true,
                "ingredients": ["ing 1 (qty)", "ing 2 (qty)"],
                "steps": ["Step 1", "Step 2"],
                "missingIngredientSuggestion": "Add 'X' to make this better/possible",
                "chefNotes": "Pro tip for cooking this",
                "healthyTip": "How to make it healthier",
                "youtubeQuery": "Search query for YouTube (e.g. how to make paneer butter masala)"
              }
            ]
          }`
        }
      ];

      const res = await callGroqAPI(groqMessages);
      
      // ─── Production-Safe Parsing Logic ─────────────────────────────────────
      let cleanText = res || "";
      
      // 1. Remove markdown wrappers
      cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "");
      
      // 2. Remove invalid control characters (U+0000 to U+001F)
      // These are often the cause of "JSON Parse error: U+0000 thru U+001F is not allowed"
      cleanText = cleanText.replace(/[\x00-\x1F\x7F]/g, "");
      
      // 3. Trim whitespace
      cleanText = cleanText.trim();

      try {
        const parsed = JSON.parse(cleanText);
        setResults(parsed.recipes || []);
      } catch (parseError) {
        console.warn("Malformed AI JSON, attempting fallback parsing...", parseError);
        // Fallback: If JSON is slightly broken, we can try to extract just the array part or show error
        Alert.alert("Chef's Note", "The recipe formatting was a bit messy, but we're working on it! Try searching again.");
        setResults([]);
      }
    } catch (e) {
      console.error("AI Fetch Error:", e);
      Alert.alert("Error", "Could not fetch AI recipes. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const openYoutube = (query) => {
    const q = encodeURIComponent(query || "Indian recipes");
    const url = `https://www.youtube.com/results?search_query=${q}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open YouTube.");
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        
        {/* Header */}
        <Animated.View entering={FadeInUp}>
          <Text style={s.title}>What Can I Cook? 👨‍🍳</Text>
          <Text style={s.subtitle}>Turn your available ingredients into a feast</Text>
        </Animated.View>

        {/* Categories Horizontal Scroll */}
        <View style={s.catSection}>
          <Text style={s.sectionTitle}>Select Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catList}>
            {COOK_CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[s.catPill, selectedCat === cat.id && s.catPillActive]} 
                onPress={() => setSelectedCat(cat.id)}
              >
                <Text style={s.catEmoji}>{cat.emoji}</Text>
                <Text style={[s.catLabel, selectedCat === cat.id && s.catLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Ingredient Input Area */}
        <View style={s.inputBox}>
          <Text style={s.sectionTitle}>What's in your kitchen?</Text>
          <View style={s.inputWrapper}>
            <TextInput 
              placeholder="Type ingredient (e.g. paneer)" 
              placeholderTextColor={COLORS.textSecondary}
              style={s.textInput}
              value={ingredientInput}
              onChangeText={setIngredientInput}
              onSubmitEditing={() => addIngredient()}
            />
            <TouchableOpacity style={s.addButton} onPress={() => addIngredient()}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Quick Suggestions */}
          <View style={s.quickIngreds}>
            {QUICK_INGREDIENTS.filter(i => !ingredients.includes(i)).slice(0, 8).map(ing => (
              <TouchableOpacity key={ing} style={s.quickPill} onPress={() => addIngredient(ing)}>
                <Text style={s.quickPillText}>+ {ing}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active Ingredients Chips */}
          <View style={s.activeIngreds}>
            {ingredients.map(ing => (
              <View key={ing} style={s.ingChip}>
                <Text style={s.ingChipText}>{ing}</Text>
                <TouchableOpacity onPress={() => removeIngredient(ing)}>
                  <Ionicons name="close-circle" size={18} color="white" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Find Button */}
        <TouchableOpacity 
          style={[s.findBtn, ingredients.length === 0 && s.findBtnDisabled]} 
          onPress={findRecipes}
          disabled={loading || ingredients.length === 0}
        >
          <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={s.findBtnGrad}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={s.findBtnText}>Generate AI Recipes 🪄</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {/* Results */}
        {searched && (
          <View style={s.resultsSection}>
            <Text style={s.sectionTitle}>Possible Delights 🎉</Text>
            {results.map((recipe, idx) => (
              <RecipeCard 
                key={idx} 
                recipe={recipe} 
                onPress={() => { setSelectedRecipe(recipe); setModalVisible(true); }} 
              />
            ))}
            {results.length === 0 && !loading && <Text style={s.emptyText}>No recipes found. Try adding more base ingredients like spices or grains.</Text>}
          </View>
        )}

        <View style={{ height: 150 }} />
      </ScrollView>

      {/* ─── Recipe Detail Modal ──────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <Animated.View entering={SlideInDown.duration(400)} style={s.modalSheet}>
            <View style={s.modalHandle} />
            {selectedRecipe && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
                <View style={s.modalHeader}>
                  <Text style={s.modalEmojiLg}>{selectedRecipe.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={s.modalTitleRow}>
                      <Text style={s.modalRecipeName}>{selectedRecipe.name}</Text>
                    </View>
                    <View style={[s.modalTypeBadge, { backgroundColor: selectedRecipe.isVeg ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 82, 82, 0.15)' }]}>
                      <View style={[s.typeDot, { backgroundColor: selectedRecipe.isVeg ? '#4CAF50' : '#FF5252' }]} />
                      <Text style={[s.modalTypeText, { color: selectedRecipe.isVeg ? '#4CAF50' : '#FF5252' }]}>{selectedRecipe.isVeg ? 'Vegetarian' : 'Non-Veg'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}>
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Macro summary */}
                <View style={s.modalStatsRow}>
                  <View style={s.modalStatItem}>
                    <Text style={s.modalStatVal}>{selectedRecipe.calories}</Text>
                    <Text style={s.modalStatLab}>Calories</Text>
                  </View>
                  <View style={s.modalStatDivider} />
                  <View style={s.modalStatItem}>
                    <Text style={s.modalStatVal}>{selectedRecipe.protein}g</Text>
                    <Text style={s.modalStatLab}>Protein</Text>
                  </View>
                  <View style={s.modalStatDivider} />
                  <View style={s.modalStatItem}>
                    <Text style={s.modalStatVal}>{selectedRecipe.prepTime}</Text>
                    <Text style={s.modalStatLab}>Time</Text>
                  </View>
                </View>

                {/* Ingredients */}
                <View style={s.modalSection}>
                  <Text style={s.modalSectionTitle}>Ingredients Needed</Text>
                  <View style={s.ingredList}>
                    {selectedRecipe.ingredients?.map((ing, i) => (
                      <View key={i} style={s.ingredItem}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                        <Text style={s.ingredText}>{ing}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Steps */}
                <View style={s.modalSection}>
                  <Text style={s.modalSectionTitle}>Cooking Steps</Text>
                  {selectedRecipe.steps?.map((step, i) => (
                    <View key={i} style={s.stepItem}>
                      <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                      <Text style={s.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Pro Tips */}
                <View style={s.tipBox}>
                  <Text style={s.tipTitle}>Chef's Note 🧑‍🍳</Text>
                  <Text style={s.tipText}>{selectedRecipe.chefNotes}</Text>
                  <View style={s.tipDivider} />
                  <Text style={s.tipTitle}>Healthy Tip 🥗</Text>
                  <Text style={s.tipText}>{selectedRecipe.healthyTip}</Text>
                </View>

                {/* YouTube Button */}
                <TouchableOpacity 
                  style={s.youtubeBtn} 
                  onPress={() => openYoutube(selectedRecipe.youtubeQuery || selectedRecipe.name)}
                >
                  <LinearGradient colors={['#FF0000', '#CC0000']} style={s.youtubeGrad}>
                    <Ionicons name="logo-youtube" size={24} color="white" />
                    <Text style={s.youtubeText}>Watch Tutorial on YouTube</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scrollContent: { padding: 20 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: COLORS.textSecondary, fontSize: 15, marginTop: 4 },
  
  catSection: { marginTop: 25 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  catList: { paddingRight: 20 },
  catPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  catPillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  catEmoji: { fontSize: 18, marginRight: 8 },
  catLabel: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  catLabelActive: { color: 'white' },

  inputBox: { marginTop: 30 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  textInput: { flex: 1, color: 'white', fontSize: 16 },
  addButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  
  quickIngreds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 },
  quickPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  quickPillText: { color: COLORS.textSecondary, fontSize: 12 },

  activeIngreds: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  ingChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15 },
  ingChipText: { color: 'white', fontSize: 14, fontWeight: '600' },

  findBtn: { marginTop: 30, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
  findBtnDisabled: { opacity: 0.5 },
  findBtnGrad: { height: 60, justifyContent: 'center', alignItems: 'center' },
  findBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  resultsSection: { marginTop: 35 },
  recipeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardEmojiBg: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardEmoji: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: 'white', fontSize: 17, fontWeight: 'bold', maxWidth: '85%' },
  cardMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  proteinText: { color: COLORS.accent, fontSize: 11, fontWeight: 'bold' },
  smartTip: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: 'rgba(245,166,35,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  smartTipText: { color: COLORS.accent, fontSize: 10, fontWeight: '600' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, paddingHorizontal: 40 },

  typeBadge: { width: 12, height: 12, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  typeDot: { width: 6, height: 6, borderRadius: 3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0A2E27', height: height * 0.88, borderTopLeftRadius: 35, borderTopRightRadius: 35 },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 15, marginBottom: 10 },
  modalScroll: { padding: 25 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25 },
  modalEmojiLg: { fontSize: 60 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalRecipeName: { color: 'white', fontSize: 24, fontWeight: 'bold', flex: 1 },
  modalTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  modalTypeText: { fontSize: 11, fontWeight: 'bold' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  
  modalStatsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 18, marginBottom: 30 },
  modalStatItem: { alignItems: 'center' },
  modalStatVal: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalStatLab: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  modalStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

  modalSection: { marginBottom: 30 },
  modalSectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  ingredList: { gap: 12 },
  ingredItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ingredText: { color: 'white', fontSize: 15 },
  stepItem: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  stepText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 24, flex: 1 },

  tipBox: { backgroundColor: 'rgba(245,166,35,0.05)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(245,166,35,0.15)' },
  tipTitle: { color: COLORS.accent, fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  tipText: { color: 'white', fontSize: 14, lineHeight: 22 },
  tipDivider: { height: 1, backgroundColor: 'rgba(245,166,35,0.1)', marginVertical: 15 },

  youtubeBtn: { marginTop: 30, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
  youtubeGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16 },
  youtubeText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default CookSuggestScreen;
