import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  TextInput,
  Modal,
  Switch,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CalorieRing from '../components/CalorieRing';
import MealLogItem from '../components/MealLogItem';

const { width } = Dimensions.get('window');

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const weeklyCalories = [1650, 1820, 1540, 1900, 1420, 1780, 1240];

const ProfileScreen = () => {
  const [profile, setProfile] = useState({
    name: 'Foodigo User',
    age: '25',
    height: '175',
    weight: '70',
    targetWeight: '65',
    goal: 'Lose Weight'
  });
  const [meals, setMeals] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newMeal, setNewMeal] = useState({ name: '', calories: '', type: 'Lunch' });
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedPlan = await AsyncStorage.getItem('foodigo_diet_plan_meta'); // We'll save meta separately or extract from plan
      const savedMeals = await AsyncStorage.getItem('foodigo_meal_logs');
      
      // Attempt to get from the main diet plan if meta doesn't exist
      const mainPlan = await AsyncStorage.getItem('foodigo_diet_plan');
      if (mainPlan) {
        // Logic to extract user data from plan or previous form
      }

      if (savedMeals) setMeals(JSON.parse(savedMeals));
    } catch (e) {
      console.error(e);
    }
  };

  const logMeal = async () => {
    if (!newMeal.name || !newMeal.calories) return;
    const meal = {
      id: Date.now(),
      ...newMeal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      emoji: getMealEmoji(newMeal.type)
    };
    const updatedMeals = [meal, ...meals];
    setMeals(updatedMeals);
    await AsyncStorage.setItem('foodigo_meal_logs', JSON.stringify(updatedMeals));
    setIsModalVisible(false);
    setNewMeal({ name: '', calories: '', type: 'Lunch' });
  };

  const deleteMeal = async (id) => {
    const updatedMeals = meals.filter(m => m.id !== id);
    setMeals(updatedMeals);
    await AsyncStorage.setItem('foodigo_meal_logs', JSON.stringify(updatedMeals));
  };

  const getMealEmoji = (type) => {
    switch(type) {
      case 'Breakfast': return '🌅';
      case 'Lunch': return '☀️';
      case 'Snack': return '🍎';
      case 'Dinner': return '🌙';
      default: return '🥗';
    }
  };

  const totalCaloriesToday = meals.reduce((acc, m) => acc + parseInt(m.calories || 0), 0);
  const calorieTarget = 1800;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Header */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={['#0D5C4E', '#062E27']}
            style={styles.headerGradient}
          >
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.nameSection}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <View style={styles.goalBadge}>
                  <Text style={styles.goalBadgeText}>Goal: {profile.goal} 🔥</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Age</Text>
                <Text style={styles.statValue}>{profile.age}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Height</Text>
                <Text style={styles.statValue}>{profile.height} cm</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Weight</Text>
                <Text style={styles.statValue}>{profile.weight} kg</Text>
              </View>
            </View>

            <View style={styles.headerButtonsRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => {}}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editBtn, { backgroundColor: COLORS.accent, borderColor: COLORS.accent, marginLeft: 10 }]} 
                onPress={() => {}}
              >
                <Text style={[styles.editBtnText, { color: 'white' }]}>My Diet Plan</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Today's Progress */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Progress 📊</Text>
        </View>
        <View style={styles.progressCard}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={20} tint="light" style={styles.progressBlur} />
            ) : (
              <View style={[styles.progressBlur, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
            )}
          </View>
          <View style={styles.progressContent}>
            <View style={styles.ringContainer}>
              <CalorieRing current={totalCaloriesToday} total={calorieTarget} />
            </View>
            
            <View style={styles.macrosRow}>
              <MacroCard label="Protein" current={45} total={120} unit="g" />
              <MacroCard label="Carbs" current={180} total={200} unit="g" />
              <MacroCard label="Fat" current={38} total={60} unit="g" />
            </View>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Week 📅</Text>
        </View>
        <View style={styles.chartCard}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={20} tint="light" style={styles.chartBlur} />
            ) : (
              <View style={[styles.chartBlur, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
            )}
          </View>
          <View style={styles.chartContent}>
            <BarChart
              data={{
                labels: weekDays,
                datasets: [{ data: weeklyCalories }]
              }}
              width={width - SIZES.padding * 2 - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'transparent',
                backgroundGradientTo: 'transparent',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(245, 166, 35, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: COLORS.accent
                },
                barPercentage: 0.6,
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              verticalLabelRotation={0}
              fromZero
              showValuesOnTopOfBars
            />
          </View>
        </View>

        {/* Meal Log */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What I Ate Today 🍽️</Text>
          <TouchableOpacity style={styles.addMealBtn} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add-circle" size={32} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.mealLogContainer}>
          {meals.length > 0 ? (
            meals.map(meal => (
              <MealLogItem key={meal.id} meal={meal} onDelete={() => deleteMeal(meal.id)} />
            ))
          ) : (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyLogText}>No meals logged yet. Start tracking! 🥗</Text>
            </View>
          )}
        </View>

        {/* Streak */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Streak 🔥</Text>
        </View>
        <View style={styles.streakCard}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={20} tint="light" style={styles.streakBlur} />
            ) : (
              <View style={[styles.streakBlur, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
            )}
          </View>
          <View style={styles.streakContent}>
            <View style={styles.streakInfo}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View>
                <Text style={styles.streakTitle}>5 Day Streak!</Text>
                <Text style={styles.streakSubtitle}>Keep going! You're on a roll 💪</Text>
              </View>
            </View>
            <View style={styles.daysRow}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <View key={i} style={[styles.dayCircle, i < 5 && styles.dayCircleActive]}>
                  <Text style={styles.dayInitial}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <SettingItem icon="target" label="My Goals" />
          <SettingItem icon="notifications" label="Notifications" />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={22} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch 
              value={darkMode} 
              onValueChange={setDarkMode}
              trackColor={{ false: '#767577', true: COLORS.accent }}
              thumbColor={'#f4f3f4'}
            />
          </View>
          <SettingItem icon="share-social" label="Share Progress" />
          <SettingItem icon="help-circle" label="Help & Support" />
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash" size={22} color="#FF5252" />
              <Text style={[styles.settingLabel, { color: '#FF5252' }]}>Reset Data</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Add Meal Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalWrapper}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={90} tint="dark" style={styles.modalBlur} />
            ) : (
              <View style={[styles.modalBlur, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]} />
            )}
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Log New Meal 🍽️</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>

              <TextInput 
                placeholder="What did you eat?" 
                placeholderTextColor={COLORS.textSecondary}
                style={styles.modalInput}
                value={newMeal.name}
                onChangeText={(v) => setNewMeal({...newMeal, name: v})}
              />
              <TextInput 
                placeholder="Calories" 
                placeholderTextColor={COLORS.textSecondary}
                style={styles.modalInput}
                keyboardType="numeric"
                value={newMeal.calories}
                onChangeText={(v) => setNewMeal({...newMeal, calories: v})}
              />

              <View style={styles.mealTypeSelector}>
                {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.typePill, newMeal.type === type && styles.typePillSelected]}
                    onPress={() => setNewMeal({...newMeal, type: type})}
                  >
                    <Text style={[styles.typeText, newMeal.type === type && styles.typeTextSelected]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.logButton} onPress={logMeal}>
                <LinearGradient
                  colors={[COLORS.accent, COLORS.secondaryAccent]}
                  style={styles.logGradient}
                >
                  <Text style={styles.logButtonText}>Log Meal</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const MacroCard = ({ label, current, total, unit }) => (
  <View style={styles.macroCard}>
    <View style={styles.macroHeader}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{current}/{total}{unit}</Text>
    </View>
    <View style={styles.macroBarBg}>
      <View style={[styles.macroBarFill, { width: `${(current/total)*100}%` }]} />
    </View>
  </View>
);

const SettingItem = ({ icon, label }) => (
  <TouchableOpacity style={styles.settingItem}>
    <View style={styles.settingLeft}>
      <Ionicons name={icon} size={22} color={COLORS.textSecondary} />
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: SIZES.padding,
  },
  headerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
    ...SHADOWS.medium,
  },
  headerGradient: {
    padding: 25,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  nameSection: {
    marginLeft: 20,
  },
  profileName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  goalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  goalBadgeText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingVertical: 15,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  editBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
  },
  progressBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  progressContent: {
    padding: 25,
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  macrosRow: {
    gap: 15,
  },
  macroCard: {
    flex: 1,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  macroValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  macroBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  chartCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
  },
  chartBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  chartContent: {
    padding: 15,
    alignItems: 'center',
  },
  addMealBtn: {
    padding: 5,
  },
  mealLogContainer: {
    marginBottom: 30,
  },
  emptyLog: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyLogText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  streakCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
  },
  streakBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  streakContent: {
    padding: 20,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  streakTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleActive: {
    backgroundColor: COLORS.accent,
  },
  dayInitial: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsSection: {
    marginBottom: 30,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    color: 'white',
    fontSize: 16,
    marginLeft: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    padding: 25,
    paddingBottom: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    color: 'white',
    fontSize: 16,
    marginBottom: 15,
  },
  mealTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  typePillSelected: {
    backgroundColor: COLORS.accent,
  },
  typeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeTextSelected: {
    color: 'white',
  },
  logButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  logGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  logButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default ProfileScreen;
