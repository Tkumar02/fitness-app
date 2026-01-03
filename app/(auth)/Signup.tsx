import { auth, db } from '@/firebase';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
// 1. Keep imports simple
import { Button, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function SignupScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme(); // 'light' or 'dark'
    
    // 2. Simple color mapping
    const isDark = colorScheme === 'dark';
    const colors = {
        bg: isDark ? '#121212' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        inputBorder: isDark ? '#444' : '#ccc',
        placeholder: isDark ? '#888' : '#aaa'
    };

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const { setUser } = useContext(UserContext);

    const handleSignup = async () => {
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

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
            });

            router.replace('/(auth)/Profile');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        // 3. Apply the background color directly
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <Text style={[styles.title, { color: colors.text }]}>Sign Up</Text>
            <TextInput
                placeholder="Email"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                // 4. Merge styles carefully
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text }]}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                placeholder="Password"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text }]}
                secureTextEntry
            />
            <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={colors.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={[styles.input, { borderColor: colors.inputBorder, color: colors.text }]}
                secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.button}>
                <Button title="Sign Up" onPress={handleSignup} />
            </View>
            <Button title="Already have an account? Login" onPress={() => router.push('/(auth)/Login')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
    input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 6 },
    error: { color: 'red', marginBottom: 10, textAlign: 'center' },
    button: { marginBottom: 10 }
});