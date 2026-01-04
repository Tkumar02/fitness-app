import { db } from '@/firebase';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { UserContext } from '../context/UserContext';

export default function ProfilePage() {
    const { user } = useContext(UserContext);
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [loading, setLoading] = useState(false);

    // Load existing data if it exists
    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.uid) return;
            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUsername(data.username || '');
                setName(data.name || '');
                setDob(data.dob || '');
                setHeight(data.height || '');
                setWeight(data.weight || '');
            }
        };
        loadProfile();
    }, [user]);

    const handleSaveProfile = async () => {
        if (!user) {
            Alert.alert('Error', 'No user logged in');
            return;
        }

        if (!username.trim()) {
            Alert.alert('Error', 'Username is required');
            return;
        }

        setLoading(true);
        try {
            // Only check for username uniqueness if the username has changed
            // For now, we'll keep your original logic but wrapped in the new UI
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                username: username.trim(),
                name,
                dob,
                height,
                weight,
            }, { merge: true });

            Alert.alert('Success', 'Profile updated!');
            router.push('/(tabs)'); 
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not save profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f9fafb' }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerSection}>
                    <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Your Profile</Text>
                    <Text style={styles.subtitle}>Set your fitness parameters</Text>
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput 
                            style={[styles.input, { color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} 
                            placeholder="e.g. fitness_pro" 
                            placeholderTextColor="#8e8e93"
                            value={username} 
                            onChangeText={setUsername} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput 
                            style={[styles.input, { color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} 
                            placeholder="John Doe" 
                            placeholderTextColor="#8e8e93"
                            value={name} 
                            onChangeText={setName} 
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth</Text>
                        <TextInput 
                            style={[styles.input, { color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} 
                            placeholder="YYYY-MM-DD" 
                            placeholderTextColor="#8e8e93"
                            value={dob} 
                            onChangeText={setDob} 
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Height (cm)</Text>
                            <TextInput 
                                style={[styles.input, { color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} 
                                placeholder="180" 
                                keyboardType="numeric"
                                placeholderTextColor="#8e8e93"
                                value={height} 
                                onChangeText={setHeight} 
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Weight (kg)</Text>
                            <TextInput 
                                style={[styles.input, { color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} 
                                placeholder="75" 
                                keyboardType="numeric"
                                placeholderTextColor="#8e8e93"
                                value={weight} 
                                onChangeText={setWeight} 
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveBtn, { backgroundColor: loading ? '#ccc' : '#007AFF' }]} 
                        onPress={handleSaveProfile}
                        disabled={loading}
                    >
                        <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Profile'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 25, alignItems: 'center', justifyContent: 'center', minHeight: '100%' },
    headerSection: { marginBottom: 30, alignItems: 'center' },
    title: { fontSize: 32, fontWeight: '900' },
    subtitle: { fontSize: 16, color: '#8e8e93', marginTop: 5 },
    
    card: {
        width: '100%',
        maxWidth: 500,
        borderRadius: 25,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '700', color: '#8e8e93', marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 },
    input: { 
        borderRadius: 12, 
        padding: 15, 
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    row: { flexDirection: 'row', marginBottom: 10 },
    saveBtn: { 
        padding: 18, 
        borderRadius: 15, 
        alignItems: 'center', 
        marginTop: 10,
        shadowColor: '#007AFF',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 3
    },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});