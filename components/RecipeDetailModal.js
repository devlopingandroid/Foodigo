import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Platform
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const RecipeDetailModal = ({ isVisible, recipe, onClose, onAddToLog }) => {
  if (!recipe) return null;

  const [checkedIngredients, setCheckedIngredients] = useState([]);

  const toggleIngredient = (ing) => {
    if (checkedIngredients.includes(ing)) {
      setCheckedIngredients(checkedIngredients.filter(i => i !== ing));
    } else {
      setCheckedIngredients([...checkedIngredients, ing]);
    }
  };

  const renderModalContent = () => (
    <>
      {/* Drag Handle */}
      <View style={styles.dragHandle} />
      
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Ionicons name="close-circle" size={32} color="white" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>{recipe.emoji}</Text>
          <Text style={styles.name}>{recipe.name}</Text>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{recipe.category}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: COLORS.accent }]}>
              <Text style={[styles.tagText, { color: 'white' }]}>{recipe.difficulty || 'Easy'}</Text>
            </View>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macros Breakdown</Text>
          <View style={styles.macrosRow}>
            <MacroItem label="Protein" value={recipe.protein || 20} unit="g" color="#4CAF50" />
            <MacroItem label="Carbs" value={recipe.carbs || 45} unit="g" color="#2196F3" />
            <MacroItem label="Fat" value={recipe.fat || 12} unit="g" color="#FFC107" />
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {(recipe.ingredients || ['Chicken', 'Spices', 'Olive Oil', 'Rice']).map((ing, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.ingredientItem} 
              onPress={() => toggleIngredient(ing)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={checkedIngredients.includes(ing) ? "checkbox" : "square-outline"} 
                size={24} 
                color={checkedIngredients.includes(ing) ? COLORS.accent : COLORS.textSecondary} 
              />
              <Text style={[
                styles.ingredientText,
                checkedIngredients.includes(ing) && styles.ingredientChecked
              ]}>{ing}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Instructions placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cooking Steps</Text>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.stepText}>Prepare all ingredients and preheat your oven/pan.</Text>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.stepText}>Cook the primary protein until golden brown and tender.</Text>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.stepText}>Mix with spices and serve hot with your favorite side.</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => {
            onAddToLog(recipe);
            onClose();
          }}
        >
          <LinearGradient
            colors={[COLORS.accent, COLORS.secondaryAccent]}
            style={styles.addGradient}
          >
            <Text style={styles.addBtnText}>Add to Today's Log</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalWrapper}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={styles.container}>
              {renderModalContent()}
            </BlurView>
          ) : (
            <View style={[styles.container, { backgroundColor: '#062E27' }]}>
              {renderModalContent()}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const MacroItem = ({ label, value, unit, color }) => (
  <View style={styles.macroItem}>
    <View style={[styles.macroBar, { backgroundColor: color, height: (value/60)*50 + 20 }]} />
    <Text style={styles.macroVal}>{value}{unit}</Text>
    <Text style={styles.macroLab}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    height: height * 0.85,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 10,
  },
  scrollContent: {
    padding: 25,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 15,
  },
  name: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tagText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    borderRadius: 20,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroBar: {
    width: 30,
    borderRadius: 15,
    marginBottom: 10,
  },
  macroVal: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  macroLab: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
  },
  ingredientText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 12,
  },
  ingredientChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  addBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
  },
  addGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  addBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default RecipeDetailModal;
