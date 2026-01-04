import { db } from '@/firebase';
import { Picker } from '@react-native-picker/picker';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';
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
    useColorScheme,
    View
} from 'react-native';
import { UserContext } from '../context/UserContext';

export default function GoalsPage() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    // Frequency
    const [strengthTarget, setStrengthTarget] = useState('0');
    const [cardioTarget, setCardioTarget] = useState('0');
    
    // Activity Selection Logic
    const [goalCategory, setGoalCategory] = useState<'cardio' | 'strength'>('cardio');
    const [activity, setActivity] = useState('Running');
    const [customList, setCustomList] = useState<{name: string, category: string}[]>([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newActivityName, setNewActivityName] = useState('');
    
    // Metrics
    const [distGoal, setDistGoal] = useState('0');
    const [timeGoal, setTimeGoal] = useState('0');

    const cardioStandards = ['Running', 'Cycling', 'Rowing', 'SkiERG', 'Swimming', 'Walking'];
    const strengthStandards = ['Dumbbells', 'Barbell', 'Leg Press', 'Cables', 'Kettlebell'];

    // 1. Fetch live custom library from same place AddWorkout saves them
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'users', user.uid, 'customEquipment'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                name: doc.data().name,
                category: doc.data().category
            }));
            setCustomList(list);
        });
        return () => unsubscribe();
    }, [user]);

    // 2. Load existing Goal settings
    useEffect(() => {
        const loadGoals = async () => {
            if (!user?.uid) return;
            const docSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStrengthTarget(data.strengthTarget?.toString() || '0');
                setCardioTarget(data.cardioTarget?.toString() || '0');
                setDistGoal(data.distGoal?.toString() || '0');
                setTimeGoal(data.timeGoal?.toString() || '0');
                setActivity(data.activity || 'Running');
            }
        };
        loadGoals();
    }, [user]);

    const handleSave = async () => {
        if (!user?.uid) return;
        const finalActivity = isAddingNew ? newActivityName.trim() : activity;
        
        try {
            // Save to Goal Settings
            await setDoc(doc(db, 'users', user.uid, 'settings', 'goals'), {
                strengthTarget: Number(strengthTarget),
                cardioTarget: Number(cardioTarget),
                activity: finalActivity,
                distGoal: Number(distGoal),
                timeGoal: Number(timeGoal),
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Save to Custom Library if it's new
            if (isAddingNew) {
                await setDoc(doc(db, 'users', user.uid, 'customEquipment', finalActivity), {
                    name: finalActivity,
                    category: goalCategory,
                    createdAt: serverTimestamp()
                });
            }
            Alert.alert("Success", "Goals and activity synced!");
        } catch (e) { Alert.alert("Error", "Save failed"); }
    };

    const dropdownOptions = [
        ...(goalCategory === 'cardio' ? cardioStandards : strengthStandards),
        ...customList.filter(i => i.category === goalCategory).map(i => i.name)
    ];

    const inputBg = isDark ? '#2c2c2e' : '#f2f2f7';
    const textColor = isDark ? '#fff' : '#000';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, { backgroundColor: isDark ? '#121212' : '#f9fafb' }]}>
                <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
                    <Text style={[styles.title, { color: textColor }]}>Edit Goals</Text>
                    
                    <Text style={styles.sectionLabel}>Frequency Targets</Text>
                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Strength/wk</Text>
                            <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={strengthTarget} onChangeText={setStrengthTarget} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Cardio/wk</Text>
                            <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={cardioTarget} onChangeText={setCardioTarget} />
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionLabel}>Trophy Achievement Goal</Text>
                    
                    {/* Goal Category Toggle */}
                    <View style={[styles.toggleRow, { backgroundColor: inputBg }]}>
                        <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'strength' && { backgroundColor: '#007AFF' }]} onPress={() => setGoalCategory('strength')}>
                            <Text style={{ color: goalCategory === 'strength' ? '#fff' : '#8e8e93', fontWeight: '700' }}>STRENGTH</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'cardio' && { backgroundColor: '#34C759' }]} onPress={() => setGoalCategory('cardio')}>
                            <Text style={{ color: goalCategory === 'cardio' ? '#fff' : '#8e8e93', fontWeight: '700' }}>CARDIO</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.pickerWrapper, { backgroundColor: inputBg }]}>
                        <Picker selectedValue={activity} onValueChange={(val) => { setActivity(val); setIsAddingNew(val === 'NEW'); }} style={{ color: textColor }}>
                            {dropdownOptions.map(opt => <Picker.Item key={opt} label={opt} value={opt} />)}
                            <Picker.Item label="➕ Add New Custom..." value="NEW" />
                        </Picker>
                    </View>

                    {isAddingNew && (
                        <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg, marginBottom: 15, borderWidth: 1, borderColor: '#007AFF' }]} placeholder="Activity Name" value={newActivityName} onChangeText={setNewActivityName} />
                    )}

                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Min Dist (km) 🏆</Text>
                            <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="decimal-pad" value={distGoal} onChangeText={setDistGoal} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Min Time (min) 🏆</Text>
                            <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={timeGoal} onChangeText={setTimeGoal} />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.btn} onPress={handleSave}>
                        <Text style={styles.btnText}>Save All Goals</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, justifyContent: 'center' },
    card: { padding: 25, borderRadius: 28, elevation: 8 },
    title: { fontSize: 24, fontWeight: '900', marginBottom: 25, textAlign: 'center' },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: '#007AFF', marginBottom: 12, textTransform: 'uppercase' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    inputGroup: { flex: 0.47 },
    toggleRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    pickerWrapper: { borderRadius: 12, marginBottom: 15, height: 50, justifyContent: 'center', overflow: 'hidden' },
    label: { fontSize: 10, fontWeight: '700', color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase' },
    input: { padding: 12, borderRadius: 12, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    divider: { height: 1, backgroundColor: 'rgba(142, 142, 147, 0.2)', marginVertical: 20 },
    btn: { backgroundColor: '#34C759', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 15 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});