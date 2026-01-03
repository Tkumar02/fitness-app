import { auth, db } from '@/firebase';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function SignupScreen() {
    const router = useRouter();
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

            // Save user in context
            setUser({
                uid: user.uid,
                email: user.email,
            });

            // Create empty user profile in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                username: '', // required later
                name: '',
                dob: '',
                height: '',
                weight: '',
            });

            // Navigate to Profile setup page
            router.replace('/(auth)/Profile');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>
            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />
            <TextInput
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
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
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 6 },
    error: { color: 'red', marginBottom: 10, textAlign: 'center' },
    button: { marginBottom: 10 }
});
