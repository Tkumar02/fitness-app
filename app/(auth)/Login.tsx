import { auth, db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView,
    StyleSheet, Text, TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { UserContext } from '../../context/UserContext';

export default function LoginScreen() {
    const router = useRouter();
    const { setUser } = useContext(UserContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await AsyncStorage.setItem('userUid', user.uid);

            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
                setUser({ uid: user.uid, ...docSnap.data(), email: null });
            } else {
                setUser({ uid: user.uid, email: user.email });
            }

            router.replace('/homepage');
        } catch (err: any) {
            setError(err.message.includes('auth/invalid-credential') 
                ? 'Invalid email or password' 
                : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/images/bg-run.png')}
            style={styles.background}
            contentFit="cover"
        >
            {/* Dark overlay to help text pop */}
            <View style={styles.overlay} />

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.glassCard}>
                        <View style={styles.headerArea}>
                            <Ionicons name="fitness" size={50} color="#34C759" />
                            <Text style={styles.title}>Welcome Back</Text>
                            <Text style={styles.subtitle}>Sign in to continue your progress</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#8e8e93" style={styles.icon} />
                                <TextInput 
                                    placeholder="your@email.com" 
                                    placeholderTextColor="#8e8e93"
                                    value={email} 
                                    onChangeText={setEmail} 
                                    style={styles.input} 
                                    autoCapitalize="none" 
                                    keyboardType="email-address" 
                                />
                            </View>

                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.icon} />
                                <TextInput 
                                    placeholder="••••••••" 
                                    placeholderTextColor="#8e8e93"
                                    value={password} 
                                    onChangeText={setPassword} 
                                    style={styles.input} 
                                    secureTextEntry 
                                />
                            </View>
                        </View>

                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity 
                            style={styles.loginBtn} 
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#34C759', '#28a745']}
                                style={styles.gradientBtn}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.loginBtnText}>Login</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => router.push('/(auth)/Signup')}
                            style={styles.signupLink}
                        >
                            <Text style={styles.signupText}>
                                No account yet? <Text style={styles.signupBold}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 25 },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.92)', // Slightly opaque for Web/Android consistency
        borderRadius: 25,
        padding: 30,
        width: '100%',
        maxWidth: 450,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10, // Android shadow
    },
    headerArea: { alignItems: 'center', marginBottom: 30 },
    title: { fontSize: 28, fontWeight: '900', color: '#1c1c1e', marginTop: 10 },
    subtitle: { fontSize: 14, color: '#8e8e93', marginTop: 5 },
    inputGroup: { width: '100%' },
    label: { fontSize: 12, fontWeight: '700', color: '#1c1c1e', marginBottom: 5, marginLeft: 5, textTransform: 'uppercase' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f7',
        borderRadius: 12,
        marginBottom: 15,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#e5e5ea',
    },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 50, color: '#000', fontSize: 16 },
    errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#ffe5e5', padding: 10, borderRadius: 8 },
    errorText: { color: '#FF3B30', fontSize: 13, marginLeft: 8, fontWeight: '600' },
    loginBtn: { width: '100%', height: 55, borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    signupLink: { marginTop: 25, alignItems: 'center' },
    signupText: { color: '#8e8e93', fontSize: 14 },
    signupBold: { color: '#34C759', fontWeight: 'bold' }
});