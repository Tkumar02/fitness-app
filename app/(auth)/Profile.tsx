import { db } from '@/firebase';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
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
import { UserContext } from '../../context/UserContext';

export default function ProfilePage() {
    const { user, setUser } = useContext(UserContext);
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [sex, setSex] = useState<'male' | 'female'>('male');
    const [role, setRole] = useState<'athlete' | 'trainer'>('athlete');
    const [blurb, setBlurb] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [shareBio, setShareBio] = useState(true);
    const [trainerId, setTrainerId] = useState('');
    const [trainerEmailSearch, setTrainerEmailSearch] = useState('');
    const [trainers, setTrainers] = useState<any[]>([]);
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
                setSex(data.sex || 'male');
                setRole(data.role || 'athlete');
                setBlurb(data.blurb || '');
                setIsPublic(data.isPublic ?? false);
                setShareBio(data.shareBio ?? true);
                setTrainerId(data.trainerId || '');
            }

            // Fetch PUBLIC trainers
            const q = query(
                collection(db, 'users'), 
                where('role', '==', 'trainer'),
                where('isPublic', '==', true)
            );
            const querySnapshot = await getDocs(q);
            const trainersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTrainers(trainersList);
        };
        loadProfile();
    }, [user]);

    const handleSearchTrainerByEmail = async () => {
        if (!trainerEmailSearch.trim()) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('email', '==', trainerEmailSearch.trim().toLowerCase()), where('role', '==', 'trainer'));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const tDoc = snap.docs[0];
                setTrainerId(tDoc.id);
                Alert.alert('Success', `Trainer ${tDoc.data().name || tDoc.data().email} selected!`);
            } else {
                Alert.alert('Not Found', 'No trainer found with that email address.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
            const profileData = {
                uid: user.uid,
                email: user.email,
                username: username.trim(),
                name,
                dob,
                height,
                weight,
                sex,
                role,
                blurb: role === 'trainer' ? blurb : '',
                isPublic: role === 'trainer' ? isPublic : false,
                shareBio: role === 'athlete' ? shareBio : false,
                trainerId: role === 'athlete' ? trainerId : '',
            };
            await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
            
            // Update context
            setUser({ ...user, ...profileData });

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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Biological Sex</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {(['male', 'female'] as const).map((option) => (
                                <TouchableOpacity 
                                    key={option}
                                    style={{
                                        flex: 1,
                                        padding: 15,
                                        borderRadius: 12,
                                        backgroundColor: sex === option ? '#007AFF' : (isDark ? '#2c2c2e' : '#f2f2f7'),
                                        alignItems: 'center'
                                    }}
                                    onPress={() => setSex(option)}
                                >
                                    <Text style={{ color: sex === option ? '#fff' : (isDark ? '#fff' : '#000'), fontWeight: '600', textTransform: 'capitalize' }}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Account Role</Text>
                        <View style={[styles.input, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7', borderColor: 'transparent' }]}>
                            <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '700', textTransform: 'capitalize' }}>
                                {role}
                            </Text>
                        </View>
                    </View>

                    {role === 'trainer' && (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Trainer Blurb (Optional)</Text>
                                <TextInput 
                                    style={[styles.input, { 
                                        color: isDark ? '#fff' : '#000', 
                                        backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7',
                                        height: 100,
                                        textAlignVertical: 'top'
                                    }]} 
                                    placeholder="Tell your athletes about yourself..." 
                                    placeholderTextColor="#8e8e93"
                                    value={blurb} 
                                    onChangeText={setBlurb}
                                    multiline
                                />
                            </View>
                            <TouchableOpacity 
                                style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                                onPress={() => setIsPublic(!isPublic)}
                            >
                                <Ionicons name={isPublic ? "checkbox" : "square-outline"} size={24} color={isPublic ? '#34C759' : '#8e8e93'} />
                                <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '700' }}>Make Profile Publicly Searchable</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {role === 'athlete' && (
                        <>
                            <TouchableOpacity 
                                style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                                onPress={() => setShareBio(!shareBio)}
                            >
                                <Ionicons name={shareBio ? "checkbox" : "square-outline"} size={24} color={shareBio ? '#34C759' : '#8e8e93'} />
                                <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '700' }}>Share Bio (Weight, Height, Age) with Trainer</Text>
                            </TouchableOpacity>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Search Trainer by Email</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TextInput 
                                        style={[styles.input, { flex: 1, color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]} 
                                        placeholder="trainer@email.com" 
                                        placeholderTextColor="#8e8e93"
                                        value={trainerEmailSearch} 
                                        onChangeText={setTrainerEmailSearch}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                    <TouchableOpacity 
                                        style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 12, justifyContent: 'center' }}
                                        onPress={handleSearchTrainerByEmail}
                                    >
                                        <Ionicons name="search" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Public Trainers</Text>
                                <View style={{ gap: 10 }}>
                                    {trainers.length === 0 ? (
                                        <Text style={{ color: '#8e8e93', fontSize: 14, fontStyle: 'italic' }}>No public trainers available.</Text>
                                    ) : (
                                        trainers.map((t) => (
                                            <View key={t.id}>
                                                <TouchableOpacity 
                                                    style={{
                                                        padding: 15,
                                                        borderRadius: 12,
                                                        backgroundColor: trainerId === t.id ? '#34C759' : (isDark ? '#2c2c2e' : '#f2f2f7'),
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                    onPress={() => setTrainerId(t.id)}
                                                >
                                                    <View>
                                                        <Text style={{ color: trainerId === t.id ? '#fff' : (isDark ? '#fff' : '#000'), fontWeight: '700' }}>
                                                            {t.name || t.username || 'Anonymous Trainer'}
                                                        </Text>
                                                        <Text style={{ color: trainerId === t.id ? 'rgba(255,255,255,0.7)' : '#8e8e93', fontSize: 12 }}>
                                                            {t.email}
                                                        </Text>
                                                    </View>
                                                    {trainerId === t.id && (
                                                        <Text style={{ color: '#fff', fontWeight: '900' }}>SELECTED</Text>
                                                    )}
                                                </TouchableOpacity>
                                                {trainerId === t.id && t.blurb && (
                                                    <View style={{ 
                                                        marginTop: 8, 
                                                        padding: 12, 
                                                        backgroundColor: isDark ? '#1c1c1e' : '#fff',
                                                        borderRadius: 10,
                                                        borderLeftWidth: 3,
                                                        borderLeftColor: '#34C759'
                                                    }}>
                                                        <Text style={{ color: isDark ? '#fff' : '#444', fontSize: 13, fontStyle: 'italic' }}>
                                                            "{t.blurb}"
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ))
                                    )}
                                </View>
                            </View>
                        </>
                    )}

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