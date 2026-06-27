import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
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

    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        card: isDark ? '#1c1c1e' : '#fff',
        text: isDark ? '#fff' : '#000',
        subtext: '#8e8e93',
        accent: '#007AFF',
        success: '#34C759',
        border: isDark ? '#38383A' : '#E5E5EA',
    };

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
    const [aspirations, setAspirations] = useState('');
    const [trainerId, setTrainerId] = useState('');
    const [trainerName, setTrainerName] = useState('');
    const [trainerStatus, setConnectionStatus] = useState<'none' | 'pending' | 'linked'>('none');
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [trainerEmailSearch, setTrainerEmailSearch] = useState('');
    const [trainers, setTrainers] = useState<any[]>([]);
    const [myClients, setMyClients] = useState<any[]>([]); // New state
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
                setAspirations(data.aspirations || '');
                setTrainerId(data.trainerId || '');
                setConnectionStatus(data.trainerId ? 'linked' : (data.pendingTrainerId ? 'pending' : 'none'));
                
                if (data.trainerId) {
                    const tSnap = await getDoc(doc(db, 'users', data.trainerId));
                    if (tSnap.exists()) setTrainerName(tSnap.data().name || tSnap.data().username || tSnap.data().email);
                }
            }

            // Fetch PUBLIC trainers
            // ... existing trainer fetch ...

            // Fetch linked clients if trainer
            if (role === 'trainer') {
                const qClients = query(collection(db, 'users'), where('trainerId', '==', user.uid));
                const snap = await getDocs(qClients);
                setMyClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        };
        loadProfile();
    }, [user, role]);

    // Separate useEffect for trainer real-time requests
    useEffect(() => {
        if (user?.uid && role === 'trainer') {
            const qReq = query(collection(db, 'users'), where('pendingTrainerId', '==', user.uid));
            const unsubReq = onSnapshot(qReq, (snap) => {
                setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsubReq();
        }
    }, [user, role]);

    const handleSearchTrainerByEmail = async () => {
        if (!trainerEmailSearch.trim()) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('email', '==', trainerEmailSearch.trim().toLowerCase()), where('role', '==', 'trainer'));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const tDoc = snap.docs[0];
                await updateDoc(doc(db, 'users', user!.uid), {
                    pendingTrainerId: tDoc.id
                });
                setConnectionStatus('pending');
                Alert.alert('Success', `Request sent to ${tDoc.data().name || tDoc.data().email}! They need to accept it from their profile.`);
            } else {
                Alert.alert('Not Found', 'This email does not match our records for a trainer.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPublicTrainer = async (tId: string, tName: string) => {
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user!.uid), { pendingTrainerId: tId });
            setConnectionStatus('pending');
            Alert.alert('Request Sent', `A connection request has been sent to ${tName}.`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

const handleRemoveTrainer = async () => {
    console.log("Unlink button pressed");
    if (!user?.uid) return;

    // 1. Define the logic that actually performs the deletion
    const performUnlink = async () => {
        console.log("Attempting Firestore update for user:", user.uid);
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { 
                trainerId: '', 
                pendingTrainerId: '' 
            });
            
            console.log("Unlink successful in Firestore.");

            // Local state updates
            setTrainerId('');
            setTrainerName('');
            setConnectionStatus('none');
            setUser({ ...user, trainerId: '' });

            // Final notification
            if (Platform.OS === 'web') {
                alert('Success: Trainer unlinked!');
            } else {
                Alert.alert('Success', 'Trainer unlinked!');
            }
        } catch (e) { 
            console.error("Error unlinking:", e);
            if (Platform.OS === 'web') {
                alert("Error: Could not remove trainer.");
            } else {
                Alert.alert("Error", "Could not remove trainer.");
            }
        } finally {
            setLoading(false);
        }
    };

    // 2. Platform-specific confirmation dialogs
    if (Platform.OS === 'web') {
        // Web/Browser logic
        const confirmed = window.confirm("Are you sure you want to unlink from your trainer?");
        if (confirmed) {
            await performUnlink();
        }
    } else {
        // Mobile logic
        Alert.alert(
            'Remove Trainer?', 
            'Are you sure you want to unlink from your trainer?', 
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: performUnlink }
            ]
        );
    }
};

    const handleAcceptClient = async (clientId: string) => {
        try {
            const clientRef = doc(db, 'users', clientId);
            await updateDoc(clientRef, {
                trainerId: user!.uid
            });
            Alert.alert('Client Accepted', 'You are now linked as their trainer.');
        } catch (e) { console.error(e); }
    };

    const handleDeclineClient = async (clientId: string) => {
        // No-op
    };

    const handleSaveProfile = async () => {
        if (!user || !user.uid) {
            Alert.alert('Error', 'User data is missing. Please log in again.');
            return;
        }

        if (!username.trim()) {
            Alert.alert('Error', 'Username is required');
            return;
        }

        setLoading(true);
        try {
            const profileData: any = {
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
                aspirations: role === 'athlete' ? aspirations : '',
                trainerId: role === 'athlete' ? trainerId : ''
            };

            await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
            
            setUser({ 
                uid: user.uid,
                email: user.email,
                ...profileData
            } as any);

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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={{ padding: 10 }}>
                            <Ionicons name="home-outline" size={24} color={isDark ? '#fff' : '#000'} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: isDark ? '#fff' : '#000', textAlign: 'center', flex: 1 }]}>Your Profile</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <Text style={[styles.subtitle, { textAlign: 'center' }]}>Set your fitness parameters</Text>
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

                            {myClients.length > 0 && (
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: '#34C759' }]}>MY ATHLETES</Text>
                                    <View style={{ gap: 10 }}>
                                        {myClients.map(client => (
                                            <View key={client.id} style={{ 
                                                padding: 15, 
                                                borderRadius: 15, 
                                                backgroundColor: isDark ? '#1c1c1e' : '#fff',
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <Text style={{ color: theme.text, fontWeight: '700' }}>
                                                    {client.name || client.username || client.email}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </>
                    )}

                    {role === 'athlete' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>What do you want to achieve? (Optional)</Text>
                            <TextInput 
                                style={[styles.input, { 
                                    color: isDark ? '#fff' : '#000', 
                                    backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7',
                                    height: 80,
                                    textAlignVertical: 'top'
                                }]} 
                                placeholder="Tell your trainer about your fitness goals..." 
                                placeholderTextColor="#8e8e93"
                                value={aspirations} 
                                onChangeText={setAspirations}
                                multiline
                            />
                            <Text style={{ color: '#8e8e93', fontSize: 11, marginTop: 4 }}>This will be shared with your trainer if linked.</Text>
                        </View>
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

                            {trainerId ? (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>YOUR TRAINER</Text>
                                    <View style={{ 
                                        padding: 20, 
                                        borderRadius: 15, 
                                        backgroundColor: isDark ? '#1c1c1e' : '#fff',
                                        flexDirection: 'row', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: '#34C759'
                                    }}>
                                        <View>
                                            <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 18, fontWeight: '800' }}>{trainerName}</Text>
                                            <Text style={{ color: '#34C759', fontWeight: '600', fontSize: 12 }}>LOCKED IN</Text>
                                        </View>
                                        <TouchableOpacity onPress={handleRemoveTrainer} style={{ padding: 10, backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: 10 }}>
                                            <Text style={{ color: '#FF3B30', fontWeight: '700', fontSize: 12 }}>UNLINK</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <>
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
                                                                backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7',
                                                                flexDirection: 'row',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center'
                                                            }}
                                                            onPress={() => handleSelectPublicTrainer(t.id, t.name || t.username || t.email)}
                                                        >
                                                            <View>
                                                                <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '700' }}>
                                                                    {t.name || t.username || 'Anonymous Trainer'}
                                                                </Text>
                                                                <Text style={{ color: '#8e8e93', fontSize: 12 }}>
                                                                    {t.email}
                                                                </Text>
                                                            </View>
                                                            <Ionicons name="person-add-outline" size={20} color="#007AFF" />
                                                        </TouchableOpacity>
                                                        {t.blurb && (
                                                            <View style={{ 
                                                                marginTop: 8, 
                                                                padding: 12, 
                                                                backgroundColor: isDark ? '#1c1c1e' : '#fff',
                                                                borderRadius: 10,
                                                                borderLeftWidth: 3,
                                                                borderLeftColor: '#007AFF'
                                                            }}>
                                                                <Text style={{ color: isDark ? '#fff' : '#444', fontSize: 13, fontStyle: 'italic' }}>
                                                                    &quot;{t.blurb}&quot;
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
