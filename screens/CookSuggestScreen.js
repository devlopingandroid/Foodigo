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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { callGroqAPI } from '../utils/api';
import Animated, { FadeInUp, FadeIn, Layout } from 'react-native-reanimated';
import SkeletonCard from '../components/SkeletonCard';

const { width } = Dimensions.get('window');

const FALLBACK_RECIPES = [
  { name: "Scrambled Eggs with Toast", emoji: "🍳", calories: 350, cookTime: "10 min", difficulty: "Easy", matchPercent: 95, haveIngredients: ["eggs", "bread", "butter"], needIngredients: ["salt", "pepper"], steps: ["Crack eggs into bowl", "Whisk with salt/pepper", "Heat butter in pan", "Cook eggs while stirring", "Toast bread"], category: 'Cook' },
  { name: "One-Pot Tomato Pasta", emoji: "🍝", calories: 450, cookTime: "20 min", difficulty: "Easy", matchPercent: 88, haveIngredients: ["pasta", "tomatoes", "garlic"], needIngredients: ["olive oil", "basil"], steps: ["Boil water", "Cook pasta", "Sauté garlic", "Add tomatoes", "Mix with pasta"], category: 'Cook' },
  { name: "Simple Vegetable Stir-Fry", emoji: "🥦", calories: 300, cookTime: "15 min", difficulty: "Easy", matchPercent: 92, haveIngredients: ["broccoli", "carrots", "soy sauce"], needIngredients: ["ginger", "oil"], steps: ["Chop veggies", "Heat oil", "Stir fry for 5 mins", "Add sauce"], category: 'Cook' },
  { name: "Tuna Salad Wrap", emoji: "🌯", calories: 400, cookTime: "5 min", difficulty: "Easy", matchPercent: 90, haveIngredients: ["tuna", "tortilla", "mayo"], needIngredients: ["onion"], steps: ["Mix tuna with mayo", "Spread on tortilla", "Roll up"], category: 'Cook' }
];

const moods = [
  { id: 'spicy', label: 'Spicy & Hot', emoji: '🌶️' },
  { id: 'sweet', label: 'Sweet & Dessert', emoji: '🍰' },
  { id: 'healthy', label: 'Light & Healthy', emoji: '🥗' },
  { id: 'hearty', label: 'Hearty & Filling', emoji: '🍖' },
  { id: 'comfort', label: 'Comfort Food', emoji: '🍜' },
  { id: 'quick', label: 'Quick (< 15 min)', emoji: '⚡' },
];

const dietaryOptions = ["Any", "Veg Only", "Non-Veg", "Low Calorie", "High Protein"];

const getDiffColor = (diff) => {
  switch(diff) {
    case 'Easy': return '#4CAF50';
    case 'Medium': return '#F5A623';
    case 'Hard': return '#FF5252';
    default: return COLORS.accent;
  }
};

const RecipeResultCard = ({ recipe, onPress }) => {
  return (
    <Animated.View entering={FadeInUp.duration(400)} layout={Layout.springify()}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={styles.resultCard}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
            {Platform.OS === 'ios' ? <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} />}
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.recipeEmoji}>{recipe.emoji || '🥘'}</Text>
              <View style={styles.headerInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.recipeName}>{recipe.name || 'AI Recipe'}</Text>
                  <View style={styles.matchBadge}><Text style={styles.matchText}>{recipe.matchPercent || 0}% match</Text></View>
                </View>
                <View style={styles.difficultyRow}>
                  <View style={[styles.diffBadge, { backgroundColor: getDiffColor(recipe.difficulty) }]}><Text style={styles.diffText}>{recipe.difficulty || 'Easy'}</Text></View>
                  <Text style={styles.recipeMeta}>{recipe.calories || 0} cal • {recipe.cookTime || '15m'}</Text>
                </View>
              </View>
            </View>
            <View style={styles.expandButton}>
              <Text style={styles.expandText}>View Full Recipe</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.accent} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const CookSuggestScreen = ({ onRecipeSelect }) => {
  const [selectedMood, setSelectedMood] = useState('healthy');
  const [selectedDiet, setSelectedDiet] = useState('Any');
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);


  const findRecipes = async () => {
    if (ingredients.length === 0 || loading) return;
    setLoading(true);
    setSearched(true);
    
    try {
      const groqMessages = [
        { 
          role: "system", 
          content: "You are a creative chef. Respond ONLY with a valid JSON object containing an array of 4 recipes. Format: { \"recipes\": [...] }" 
        },
        { 
          role: "user", 
          content: `Suggest 4 recipes I can cook with these ingredients: ${ingredients.join(', ')}. Mood: ${selectedMood}. Diet: ${selectedDiet}. Each recipe must have: name, emoji, calories, cookTime, difficulty (Easy/Medium/Hard), matchPercent, haveIngredients, needIngredients, steps, category: 'Cook'.`
        }
      ];

      const rawText = await callGroqAPI(groqMessages);
      
      const cleanJson = (rawText || "").replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      setResults(parsed.recipes || []);
    } catch (error) {
      console.error("Cook API Error:", error.message);
      Alert.alert(
        "Chef is Busy! 🧑‍🍳", 
        "Could not get fresh suggestions. Showing some kitchen staples instead!",
        [{ text: "Show Recipes", onPress: () => setResults(FALLBACK_RECIPES) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    if (ingredientInput.trim() && !ingredients.includes(ingredientInput.trim().toLowerCase())) {
      setIngredients([...ingredients, ingredientInput.trim().toLowerCase()]);
      setIngredientInput('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp}>
          <View style={styles.header}>
            <Text style={styles.title}>What Can I Cook? 👨‍🍳</Text>
            <Text style={styles.subtitle}>Ingredients you have at home</Text>
          </View>
        </Animated.View>

        <View style={styles.moodGrid}>
          {moods.map((mood) => (
            <TouchableOpacity key={mood.id} style={[styles.moodCard, selectedMood === mood.id && styles.moodCardSelected]} onPress={() => setSelectedMood(mood.id)}>
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[styles.moodLabel, selectedMood === mood.id && styles.moodLabelSelected]}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.ingredientInputContainer}>
          <View style={styles.inputWrapper}>
            {Platform.OS === 'ios' ? <BlurView intensity={20} tint="light" style={styles.inputBlur} /> : <View style={[styles.inputBlur, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />}
            <View style={styles.inputContent}>
              <TextInput placeholder="e.g. eggs, tomatoes..." placeholderTextColor={COLORS.textSecondary} style={styles.textInput} value={ingredientInput} onChangeText={setIngredientInput} onSubmitEditing={addIngredient} />
              <TouchableOpacity style={styles.addButton} onPress={addIngredient}><Ionicons name="add" size={24} color="white" /></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.ingredientsList}>
          {ingredients.map((ing) => (
            <View key={ing} style={styles.ingPill}><Text style={styles.ingPillText}>{ing}</Text><TouchableOpacity onPress={() => setIngredients(ingredients.filter(i => i !== ing))}><Ionicons name="close-circle" size={16} color="white" style={{ marginLeft: 5 }} /></TouchableOpacity></View>
          ))}
        </View>

        <TouchableOpacity style={[styles.findButton, ingredients.length === 0 && styles.findButtonDisabled]} onPress={findRecipes} disabled={loading || ingredients.length === 0}>
          <LinearGradient colors={[COLORS.accent, COLORS.secondaryAccent]} style={styles.buttonGradient}>{loading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.buttonText}>Find AI Recipes 🔍</Text>}</LinearGradient>
        </TouchableOpacity>

        {searched && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Suggestions 🎉</Text>
            {results.map((recipe, idx) => (
              <RecipeResultCard key={idx} recipe={recipe} onPress={() => onRecipeSelect({...recipe, category: 'Cook'})} />
            ))}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scrollContent: { padding: 20 },
  header: { marginBottom: 25 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: COLORS.textSecondary, fontSize: 16, marginTop: 4 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  moodCard: { width: '31%', height: 90, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  moodCardSelected: { borderColor: COLORS.accent, borderWidth: 1 },
  moodEmoji: { fontSize: 24, marginBottom: 5 },
  moodLabel: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' },
  moodLabelSelected: { color: COLORS.accent },
  ingredientInputContainer: { marginBottom: 15 },
  inputWrapper: { borderRadius: 15, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  inputBlur: { ...StyleSheet.absoluteFillObject },
  inputContent: { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 15 },
  textInput: { flex: 1, color: 'white' },
  addButton: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  ingredientsList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  ingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginRight: 5, marginBottom: 5 },
  ingPillText: { color: 'white', fontSize: 12 },
  findButton: { borderRadius: 30, overflow: 'hidden', marginBottom: 30 },
  findButtonDisabled: { opacity: 0.5 },
  buttonGradient: { paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  resultsSection: { marginTop: 10 },
  resultCard: { marginBottom: 15, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  cardContent: { padding: 15 },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  recipeEmoji: { fontSize: 40, marginRight: 10 },
  headerInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recipeName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  matchBadge: { backgroundColor: 'rgba(245,166,35,0.2)', paddingHorizontal: 5, borderRadius: 5 },
  matchText: { color: COLORS.accent, fontSize: 10 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  diffBadge: { paddingHorizontal: 6, borderRadius: 4, marginRight: 5 },
  diffText: { color: 'white', fontSize: 10 },
  recipeMeta: { color: COLORS.textSecondary, fontSize: 10 },
  expandButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  expandText: { color: COLORS.accent, fontSize: 12, fontWeight: 'bold' },
});

export default CookSuggestScreen;
