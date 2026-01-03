import { db } from '@/firebase';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function ProfilePage() {
    const { user } = useContext(UserContext);
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    const handleSaveProfile = async () => {
        if (!user) {
            Alert.alert('Error', 'No user logged in');
            return;
        }

        if (!username.trim()) {
            Alert.alert('Error', 'Username is required');
            return;
        }

        try {
            // 🔎 check if username already exists
            const q = query(collection(db, 'users'), where('username', '==', username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                Alert.alert('Error', 'Username already taken. Please choose another.');
                return;
            }

            // ✅ save user profile
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
            router.push('/(tabs)'); // go to landing or home page
        } catch (err) {
            console.error('Error saving profile:', err);
            Alert.alert('Error', 'Could not save profile.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Complete Your Profile</Text>

            <TextInput style={styles.input} placeholder="Username (required)" value={username} onChangeText={setUsername} />
            <TextInput style={styles.input} placeholder="Full Name (optional)" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Date of Birth (optional)" value={dob} onChangeText={setDob} />
            <TextInput style={styles.input} placeholder="Height (optional)" value={height} onChangeText={setHeight} />
            <TextInput style={styles.input} placeholder="Weight (optional)" value={weight} onChangeText={setWeight} />

            <Button title="Save Profile" onPress={handleSaveProfile} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 8 },
});
