import { db } from '@/firebase';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
// 1. Add useColorScheme here
import { Alert, Button, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function ProfilePage() {
    const { user } = useContext(UserContext);
    const router = useRouter();
    
    // 2. Detect theme and define colors locally
    const isDark = useColorScheme() === 'dark';
    const theme = {
        background: isDark ? '#121212' : '#f9f9f9',
        text: isDark ? '#FFFFFF' : '#000000',
        inputBg: isDark ? '#1E1E1E' : '#FFFFFF',
        inputBorder: isDark ? '#333333' : '#cccccc',
        placeholder: isDark ? '#888888' : '#999999'
    };

    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    const handleSaveProfile = async () => {
        // ... (Logic remains 100% untouched)
        if (!user) {
            Alert.alert('Error', 'No user logged in');
            return;
        }

        if (!username.trim()) {
            Alert.alert('Error', 'Username is required');
            return;
        }

        try {
            const q = query(collection(db, 'users'), where('username', '==', username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                Alert.alert('Error', 'Username already taken. Please choose another.');
                return;
            }

            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                username,
                name,
                dob,
                height,
                weight,
            });

            Alert.alert('Success', 'Profile saved!');
            router.push('/(tabs)'); 
        } catch (err) {
            console.error('Error saving profile:', err);
            Alert.alert('Error', 'Could not save profile.');
        }
    };

    return (
        // 3. Use array syntax to override colors without breaking the original layout
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Text style={[styles.title, { color: theme.text }]}>Complete Your Profile</Text>

            <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]} 
                placeholder="Username (required)" 
                placeholderTextColor={theme.placeholder}
                value={username} 
                onChangeText={setUsername} 
            />
            <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]} 
                placeholder="Full Name (optional)" 
                placeholderTextColor={theme.placeholder}
                value={name} 
                onChangeText={setName} 
            />
            <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]} 
                placeholder="Date of Birth (optional)" 
                placeholderTextColor={theme.placeholder}
                value={dob} 
                onChangeText={setDob} 
            />
            <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]} 
                placeholder="Height (optional)" 
                placeholderTextColor={theme.placeholder}
                value={height} 
                onChangeText={setHeight} 
            />
            <TextInput 
                style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]} 
                placeholder="Weight (optional)" 
                placeholderTextColor={theme.placeholder}
                value={weight} 
                onChangeText={setWeight} 
            />

            <Button title="Save Profile" onPress={handleSaveProfile} />
        </View>
    );
}

// Styles remain untouched from your original version
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 8 },
});