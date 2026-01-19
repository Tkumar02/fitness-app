import { auth, db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { UserContext } from '../../context/UserContext';

export default function SignupScreen() {
    const router = useRouter();
    const { setUser } = useContext(UserContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async () => {
        setError('');
        if (!email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            setUser({ uid: user.uid, email: user.email });

            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                username: '',
                name: '',
                dob: '',
                height: '',
                weight: '',
                createdAt: new Date().toISOString(),
            });

            router.replace('/(auth)/Profile');
        } catch (err: any) {
            setError(err.message);
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
            <View style={styles.overlay} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.glassCard}>
                        <View style={styles.headerArea}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="person-add" size={30} color="#34C759" />
                            </View>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>Join the community and start tracking</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
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
                                    placeholder="Create a password"
                                    placeholderTextColor="#8e8e93"
                                    value={password}
                                    onChangeText={setPassword}
                                    style={styles.input}
                                    secureTextEntry
                                />
                            </View>

                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#8e8e93" style={styles.icon} />
                                <TextInput
                                    placeholder="Repeat your password"
                                    placeholderTextColor="#8e8e93"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
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
                            style={styles.signupBtn}
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#34C759', '#28a745']}
                                style={styles.gradientBtn}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.signupBtnText}>Get Started</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/(auth)/Login')}
                            style={styles.loginLink}
                        >
                            <Text style={styles.loginText}>
                                Already have an account? <Text style={styles.loginBold}>Login</Text>
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
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 25 },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 30,
        padding: 25,
        width: '100%',
        maxWidth: 450,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    headerArea: { alignItems: 'center', marginBottom: 25 },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f2f2f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15
    },
    title: { fontSize: 26, fontWeight: '900', color: '#1c1c1e' },
    subtitle: { fontSize: 14, color: '#8e8e93', marginTop: 5, textAlign: 'center' },
    inputGroup: { width: '100%' },
    label: { fontSize: 12, fontWeight: '700', color: '#1c1c1e', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f7',
        borderRadius: 15,
        marginBottom: 15,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#e5e5ea',
    },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 50, color: '#000', fontSize: 16 },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffe5e5',
        padding: 12,
        borderRadius: 10,
        marginBottom: 15
    },
    errorText: { color: '#FF3B30', fontSize: 13, marginLeft: 8, fontWeight: '600', flex: 1 },
    signupBtn: { width: '100%', height: 55, borderRadius: 15, overflow: 'hidden', marginTop: 10 },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    signupBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    loginLink: { marginTop: 20, alignItems: 'center', paddingBottom: 10 },
    loginText: { color: '#8e8e93', fontSize: 14 },
    loginBold: { color: '#34C759', fontWeight: 'bold' }
});