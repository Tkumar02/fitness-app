import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function LandingScreen() {
    const router = useRouter();

    useEffect(() => {
        const checkLoggedIn = async () => {
            const uid = await AsyncStorage.getItem('userUid');

            if (uid) {
                // User is logged in → go to Home
                router.replace('/(tabs)');
            } else {
                // Not logged in → go to Login
                router.replace('/(auth)/Login');
            }
        };

        checkLoggedIn();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Checking login status…</Text>
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18, fontWeight: '500' },
});
