//index.tsx in app folder
import { Redirect } from 'expo-router';
import React, { useContext } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { UserContext } from '../context/UserContext'; // Path might be './context/UserContext' if you didn't move it

export default function Index() {
    const { user, loading } = useContext(UserContext);

    // 1. Show a loader while UserContext determines if we have a user
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    // 2. Perform the redirect based on the TRUE auth state
    if (user) {
        return <Redirect href="/(tabs)" />;
    } else {
        // If no user, send them to the homepage or login
        return <Redirect href="/homepage" />;
    }
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#fff' // Or use your theme color
    },
});