import { auth, db } from '@/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageBackground } from 'expo-image';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { UserContext } from '../../context/UserContext';

export default function LoginScreen() {
    const router = useRouter();
    const { setUser } = useContext(UserContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
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

            router.replace('/homepage'); // navigate to home page
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/images/bg-run.png')}
            style={styles.background}
            contentFit="cover">
            <View style={styles.container}>
                <Text style={styles.title}>Login</Text>
                <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
                <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button color="lightgreen" title="Login" onPress={handleLogin} />
                <View style={styles.button}>
                    <Button color="lightgreen"
                        title="No account yet? Sign Up" onPress={() => router.push('/(auth)/Signup')} />
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 24, marginBottom: 20, textAlign: 'center', fontWeight: 'bold', color: 'lightgreen' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 6, color: 'lightgreen' },
    error: { color: 'red', marginBottom: 10, textAlign: 'center' },
    button: { marginTop: 10 },
    background: { flex: 1, justifyContent: 'center', }
});
