import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Keyboard,
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
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../constants/theme';
import { callGroqAPI } from '../utils/api';

const FALLBACK_RESPONSES = [
  "That's a great question about food! While I'm currently processing a lot of requests, I recommend checking out our Explore tab for some fresh recipe ideas. 🥗",
  "I'm catching my breath for a second! 🤖 Generally, a balanced diet with protein, healthy fats, and fiber is the way to go. What's your favorite healthy snack?",
  "Our AI chef is currently a bit overwhelmed with orders! 🍳 Try asking me again in a minute. In the meantime, did you know that drinking enough water can boost your energy?",
  "I'm currently resting my circuits, but I'll be back shortly to help with your nutrition goals! ⚡ Stay hydrated!",
  "Great to see you! I'm experiencing high traffic right now. Feel free to browse our trending recipes in the home screen! 🍎"
];

// ── Animated typing dots ────────────────────────────────────────────────────
const TypingDot = ({ delay }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
};

const TypingIndicator = () => (
  <Animated.View
    entering={FadeInLeft.duration(300).springify().damping(18)}
    style={styles.typingBubble}
  >
    <TypingDot delay={0} />
    <TypingDot delay={150} />
    <TypingDot delay={300} />
  </Animated.View>
);

// ── Chat Bubble ─────────────────────────────────────────────────────────────
const ChatBubble = ({ message, isUser }) => (
  <Animated.View
    entering={
      isUser
        ? FadeInRight.duration(350).springify().damping(18)
        : FadeInLeft.duration(350).springify().damping(18)
    }
    style={[
      styles.bubble,
      isUser ? styles.userBubble : styles.botBubble
    ]}
  >
    {!isUser && (
      <View style={styles.bubbleAvatarRow}>
        <View style={styles.bubbleAvatar}>
          <Text style={styles.bubbleAvatarEmoji}>🤖</Text>
        </View>
      </View>
    )}
    <Text style={styles.bubbleText}>{message.text}</Text>
    <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
      {message.time}
    </Text>
  </Animated.View>
);

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! I'm Foodigo AI 🤖. How can I help you today?", isUser: false, time: "10:00 AM" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text = inputText) => {
    const finalMsg = typeof text === 'string' ? text : inputText;
    if (!finalMsg.trim() || isLoading) return;

    const userMsg = {
      id: Date.now(),
      text: finalMsg.trim(),
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    const prompt = finalMsg.toLowerCase().trim();
    const forbiddenKeywords = [
      'code', 'javascript', 'python', 'java', 'html', 'css', 'react', 'programming',
      'politics', 'election', 'president', 'prime minister', 'hacking', 'illegal',
      'adult', 'porn', 'sex', 'math', 'physics', 'chemistry', 'calculus', 'exam',
      'movies', 'bollywood', 'hollywood', 'relationship', 'dating', 'marriage'
    ];

    const isUnrelated = forbiddenKeywords.some(keyword => prompt.includes(keyword)) &&
      !['food', 'recipe', 'diet', 'nutrition', 'cook', 'meal'].some(k => prompt.includes(k));

    if (isUnrelated) {
      setTimeout(() => {
        const botMsg = {
          id: Date.now() + 1,
          text: "I'm specially designed to help only with food, nutrition, recipes, fitness diets, and wellness guidance 🍎",
          isUser: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
      }, 600);
      return;
    }

    try {
      const groqMessages = [
        {
          role: "system",
          content: `You are Foodigo AI, a specialized Indian Nutritionist and Wellness Coach. 
          STRICT RULES:
          1. ONLY answer questions related to food, nutrition, recipes, Indian diet, calories, macros, fitness meals, weight management, and cooking.
          2. REFUSE to answer anything else: coding, politics, math, general science, movies, or relationships.
          3. If asked an unrelated question, respond with: "I'm specially designed to help only with food, nutrition, recipes, fitness diets, and wellness guidance 🍎"
          4. Be concise, practical, and encourage healthy habits.`
        },
        { role: "user", content: finalMsg.trim() }
      ];

      const botResponse = await callGroqAPI(groqMessages);

      const botMsg = {
        id: Date.now() + 1,
        text: botResponse.trim(),
        isUser: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat Error:", error.message);

      let fallbackText = "I'm having trouble connecting to my brain! Please try again in a moment. 🤖";

      if (error.message === "TIMEOUT" || error.message.includes("API_ERROR")) {
        fallbackText = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
      } else if (error.message === "EMPTY_RESPONSE") {
        fallbackText = "I couldn't quite put that into words. Could you rephrase your question? 🤔";
      }

      const errorMsg = {
        id: Date.now() + 1,
        text: fallbackText,
        isUser: false,
        time: "Now"
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* ── Header ── */}
        <Animated.View
          entering={FadeInDown.duration(400).springify().damping(18)}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.botInfo}>
              <View style={styles.botAvatarWrapper}>
                <View style={styles.botAvatar}>
                  <Text style={styles.botEmoji}>🤖</Text>
                </View>
                <View style={styles.onlineBadge} />
              </View>
              <View>
                <Text style={styles.botName}>Foodigo AI</Text>
                <View style={styles.statusRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.botStatus}>Online & Ready</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setMessages([messages[0]])}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Chat Area ── */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={16}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} isUser={msg.isUser} />
          ))}
          {isLoading && <TypingIndicator />}
        </ScrollView>

        {/* ── Input Bar ── */}
        <Animated.View
          entering={FadeInUp.duration(400).springify().damping(18)}
          style={[
            styles.inputContainer,
            isKeyboardVisible && styles.inputContainerKeyboard
          ]}
        >
          <View style={styles.inputWrapper}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={20} tint="light" style={styles.inputBlur} />
            ) : (
              <View style={[styles.inputBlur, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} />
            )}
            <View style={styles.inputContent}>
              <TextInput
                placeholder="Ask anything about food..."
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isLoading}
                textAlignVertical="center"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isLoading) && styles.sendButtonDisabled
                ]}
                onPress={() => sendMessage()}
                disabled={!inputText.trim() || isLoading}
                activeOpacity={0.75}
              >
                <Ionicons name="send" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    // subtle backdrop depth
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatarWrapper: {
    position: 'relative',
    marginRight: 13,
  },
  botAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    // subtle glow ring
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  botEmoji: {
    fontSize: 24,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  botName: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  botStatus: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // ── Chat Area ─────────────────────────────────────────────────────────────
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 24,
  },

  // ── Bubbles ───────────────────────────────────────────────────────────────
  bubble: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 5,
    paddingHorizontal: 16,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 16,
  },
  bubbleAvatarRow: {
    marginBottom: 6,
  },
  bubbleAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleAvatarEmoji: {
    fontSize: 13,
  },
  bubbleText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  bubbleTime: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    marginTop: 7,
    textAlign: 'left',
  },
  bubbleTimeUser: {
    textAlign: 'right',
  },

  // ── Typing indicator ──────────────────────────────────────────────────────
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 5,
    ...SHADOWS.small,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
    opacity: 0.8,
  },

  // ── Input ─────────────────────────────────────────────────────────────────
  inputContainer: {
    paddingTop: 12,
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 100 : 90,
    backgroundColor: COLORS.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  inputContainerKeyboard: {
    paddingBottom: 15, // Reduced padding when keyboard is up
  },
  inputWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    ...SHADOWS.medium,
  },
  inputBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    minHeight: 56,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    paddingVertical: 12,
    marginRight: 12,
    lineHeight: 22,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(245, 166, 35, 0.18)',
    elevation: 0,
    shadowOpacity: 0,
  },
});

export default ChatbotScreen;