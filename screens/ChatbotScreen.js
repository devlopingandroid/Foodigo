import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { callGroqAPI } from '../utils/api';
import Animated, { FadeInLeft, FadeInRight, FadeInUp } from 'react-native-reanimated';

const FALLBACK_RESPONSES = [
  "That's a great question about food! While I'm currently processing a lot of requests, I recommend checking out our Explore tab for some fresh recipe ideas. 🥗",
  "I'm catching my breath for a second! 🤖 Generally, a balanced diet with protein, healthy fats, and fiber is the way to go. What's your favorite healthy snack?",
  "Our AI chef is currently a bit overwhelmed with orders! 🍳 Try asking me again in a minute. In the meantime, did you know that drinking enough water can boost your energy?",
  "I'm currently resting my circuits, but I'll be back shortly to help with your nutrition goals! ⚡ Stay hydrated!",
  "Great to see you! I'm experiencing high traffic right now. Feel free to browse our trending recipes in the home screen! 🍎"
];

const ChatBubble = ({ message, isUser }) => (
  <Animated.View 
    entering={isUser ? FadeInRight.duration(400) : FadeInLeft.duration(400)}
    style={[
      styles.bubble, 
      isUser ? styles.userBubble : styles.botBubble
    ]}
  >
    <Text style={styles.bubbleText}>{message.text}</Text>
    <Text style={styles.bubbleTime}>{message.time}</Text>
  </Animated.View>
);

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! I'm Foodigo AI 🤖. How can I help you today?", isUser: false, time: "10:00 AM" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef();

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

    try {
      const groqMessages = [
        { role: "system", content: "You are Foodigo AI, a friendly expert food assistant. Answer concisely and helpfuly." },
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
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.botInfo}>
            <View style={styles.botAvatar}>
              <Text style={styles.botEmoji}>🤖</Text>
              <View style={styles.onlineBadge} />
            </View>
            <View>
              <Text style={styles.botName}>Foodigo AI</Text>
              <Text style={styles.botStatus}>Online & Ready</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setMessages([messages[0]])}>
            <Ionicons name="trash-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} isUser={msg.isUser} />
        ))}
        {isLoading && (
          <View style={styles.typingContainer}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.typingText}>Foodigo is thinking...</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={100}>
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={20} tint="light" style={styles.inputBlur} />
            ) : (
              <View style={[styles.inputBlur, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
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
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]} 
                onPress={() => sendMessage()}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  header: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  botInfo: { flexDirection: 'row', alignItems: 'center' },
  botAvatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  botEmoji: { fontSize: 24 },
  onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: COLORS.primary },
  botName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  botStatus: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },
  chatArea: { flex: 1 },
  chatContent: { padding: 20, paddingBottom: 120 },
  bubble: { maxWidth: '85%', padding: 16, borderRadius: 22, marginBottom: 15, ...SHADOWS.small },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.accent, borderBottomRightRadius: 4 },
  botBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  bubbleText: { color: 'white', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  bubbleTime: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 6, textAlign: 'right' },
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 5, marginBottom: 20 },
  typingText: { color: COLORS.textSecondary, fontSize: 13, marginLeft: 10, fontStyle: 'italic' },
  inputContainer: { paddingTop: 15, paddingHorizontal: 15, paddingBottom: Platform.OS === 'ios' ? 100 : 90, backgroundColor: COLORS.primary, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  inputWrapper: { borderRadius: 28, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', ...SHADOWS.medium },
  inputBlur: { ...StyleSheet.absoluteFillObject },
  inputContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, minHeight: 56, maxHeight: 120 },
  input: { flex: 1, color: 'white', fontSize: 16, paddingVertical: 12, marginRight: 12 },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  sendButtonDisabled: { backgroundColor: 'rgba(245, 166, 35, 0.2)', elevation: 0 }
});

export default ChatbotScreen;
