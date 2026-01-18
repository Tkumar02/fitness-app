import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import {
    addDoc, collection, deleteDoc, doc, getDoc,
    onSnapshot, orderBy, query, serverTimestamp, setDoc, where
} from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

export default function GoalsPage() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    // 1. Weekly Frequency States
    const [strengthTarget, setStrengthTarget] = useState('0');
    const [cardioTarget, setCardioTarget] = useState('0');
    
    // 2. Goal Creation States
    const [goalCategory, setGoalCategory] = useState<'cardio' | 'strength'>('strength');
    const [activity, setActivity] = useState('');
    const [customList, setCustomList] = useState<{name: string, category: string}[]>([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newActivityName, setNewActivityName] = useState('');
    const [pickerVisible, setPickerVisible] = useState(false);
    
    // 3. Metric States
    const [distGoal, setDistGoal] = useState('');
    const [timeGoal, setTimeGoal] = useState('');
    const [loadGoal, setLoadGoal] = useState('');
    const [setsGoal, setSetsGoal] = useState('');
    const [repsGoal, setRepsGoal] = useState('');
    const [cardioMode, setCardioMode] = useState<'endurance' | 'performance'>('endurance');

    // 4. Data Lists
    const [activeGoals, setActiveGoals] = useState<any[]>([]);
    const [completedGoals, setCompletedGoals] = useState<any[]>([]);

    const cardioStandards = ['Running', 'Cycling', 'Rowing', 'Swimming', 'Walking'];
    const strengthStandards = ['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Leg Press'];

    useEffect(() => {
        if (!user?.uid) return;
        
        // Load Weekly Targets
        const loadSettings = async () => {
            const docSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
            if (docSnap.exists()) {
                setStrengthTarget(docSnap.data().strengthTarget?.toString() || '0');
                setCardioTarget(docSnap.data().cardioTarget?.toString() || '0');
            }
        };
        loadSettings();

        // Listen for Custom Activities
        const unsubCustom = onSnapshot(query(collection(db, 'users', user.uid, 'customEquipment')), (snap) => {
            setCustomList(snap.docs.map(d => ({ name: d.data().name, category: d.data().category })));
        });

        // Listen for Active Trophies
        const unsubActive = onSnapshot(query(collection(db, 'users', user.uid, 'activeGoals'), orderBy('createdAt', 'desc')), (snap) => {
            setActiveGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Listen for Wall of Fame (Completed Workouts)
        const unsubDone = onSnapshot(query(collection(db, 'workouts'), where('userId', '==', user.uid), where('goalMet', '==', true), orderBy('date', 'desc')), (snap) => {
            setCompletedGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubCustom(); unsubActive(); unsubDone(); };
    }, [user]);

    const handleSaveGoal = async () => {
        if (!user?.uid) return;
        const finalActivity = isAddingNew ? newActivityName.trim() : activity;
        if (!finalActivity) { Alert.alert("Missing Info", "Select an activity."); return; }
        
        try {
            // Save Frequency Settings
            await setDoc(doc(db, 'users', user.uid, 'settings', 'goals'), {
                strengthTarget: Number(strengthTarget),
                cardioTarget: Number(cardioTarget),
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Prepare Trophy Goal
            const goalData: any = {
                activity: finalActivity,
                category: goalCategory,
                createdAt: serverTimestamp(),
                userId: user.uid,
            };

            if (goalCategory === 'strength') {
                const w = Number(loadGoal) || 0;
                const r = Number(repsGoal) || 0;
                const s = Number(setsGoal) || 0;
                goalData.loadGoal = w;
                goalData.setsGoal = s;
                goalData.repsGoal = r;
                // NEW MATH: 1RM and Total Volume Targets
                goalData.target1RM = w * (1 + r / 30);
                goalData.targetVolume = w * r * s;
            } else {
                goalData.distGoal = Number(distGoal) || 0;
                goalData.timeGoal = Number(timeGoal) || 0;
                goalData.cardioMode = cardioMode;
            }

            await addDoc(collection(db, 'users', user.uid, 'activeGoals'), goalData);

            if (isAddingNew) {
                await setDoc(doc(db, 'users', user.uid, 'customEquipment', finalActivity), {
                    name: finalActivity, category: goalCategory
                });
            }

            Alert.alert("Goal Set!", "Chase that trophy!");
            setActivity(''); setLoadGoal(''); setSetsGoal(''); setRepsGoal(''); setDistGoal(''); setTimeGoal('');
            setIsAddingNew(false); setNewActivityName('');
        } catch (e) { Alert.alert("Error", "Save failed."); }
    };

    const dropdownOptions = [
        ...(goalCategory === 'cardio' ? cardioStandards : strengthStandards),
        ...customList.filter(i => i.category === goalCategory).map(i => i.name)
    ];

    const inputBg = isDark ? '#2c2c2e' : '#f2f2f7';
    const textColor = isDark ? '#fff' : '#000';
    const cardBg = isDark ? '#1c1c1e' : '#fff';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    
                    {/* 1. FREQUENCY SECTION */}
                    <Text style={[styles.sectionHeader, { color: textColor }]}>📅 Weekly Targets</Text>
                    <View style={[styles.card, { backgroundColor: cardBg, marginBottom: 25 }]}>
                        <View style={styles.row}>
                            <View style={styles.inputWrap}>
                                <Text style={styles.label}>Strength Sessions</Text>
                                <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={strengthTarget} onChangeText={setStrengthTarget} />
                            </View>
                            <View style={styles.inputWrap}>
                                <Text style={styles.label}>Cardio Sessions</Text>
                                <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={cardioTarget} onChangeText={setCardioTarget} />
                            </View>
                        </View>
                    </View>

                    {/* 2. ACTIVE TROPHIES */}
                    <Text style={[styles.sectionHeader, { color: textColor }]}>🎯 Active Achievement Goals</Text>
                    {activeGoals.map((g) => (
                        <View key={g.id} style={[styles.activeCard, { backgroundColor: g.category === 'cardio' ? '#c75434' : '#007AFF' }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.activeTitle}>{g.activity}</Text>
                                <Text style={styles.activeSub}>
                                    {g.category === 'strength' 
                                        ? `${g.loadGoal}kg • ${g.setsGoal}x${g.repsGoal} (Vol: ${g.targetVolume})`
                                        : g.cardioMode === 'performance' ? `${g.distGoal}km under ${g.timeGoal}m` : `${g.distGoal}km or ${g.timeGoal}m`}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => deleteDoc(doc(db, 'users', user!.uid, 'activeGoals', g.id))}>
                                <Ionicons name="close-circle" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* 3. NEW GOAL CREATOR */}
                    <View style={[styles.card, { backgroundColor: cardBg, marginTop: 15 }]}>
                        <Text style={[styles.title, { color: textColor }]}>New Milestone</Text>
                        <View style={[styles.toggleRow, { backgroundColor: inputBg }]}>
                            <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'strength' && { backgroundColor: '#007AFF' }]} onPress={() => setGoalCategory('strength')}>
                                <Text style={{ color: goalCategory === 'strength' ? '#fff' : '#8e8e93', fontWeight: 'bold', fontSize: 12 }}>STRENGTH</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'cardio' && { backgroundColor: '#c75434' }]} onPress={() => setGoalCategory('cardio')}>
                                <Text style={{ color: goalCategory === 'cardio' ? '#fff' : '#8e8e93', fontWeight: 'bold', fontSize: 12 }}>CARDIO</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[styles.picker, { backgroundColor: inputBg, marginTop: 15 }]} onPress={() => setPickerVisible(true)}>
                            <Text style={{ color: activity ? textColor : '#8e8e93', fontWeight: 'bold' }}>{activity || "Choose Exercise..."}</Text>
                        </TouchableOpacity>

                        {isAddingNew && (
                            <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg, marginTop: 10, borderWidth: 1, borderColor: '#007AFF' }]} placeholder="Activity Name..." placeholderTextColor="#8e8e93" value={newActivityName} onChangeText={setNewActivityName} />
                        )}

                        {goalCategory === 'strength' ? (
                            <View style={styles.row}>
                                <View style={styles.inputWrap}><Text style={styles.label}>kg</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={loadGoal} onChangeText={setLoadGoal} /></View>
                                <View style={styles.inputWrap}><Text style={styles.label}>Sets</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={setsGoal} onChangeText={setSetsGoal} /></View>
                                <View style={styles.inputWrap}><Text style={styles.label}>Reps</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={repsGoal} onChangeText={setRepsGoal} /></View>
                            </View>
                        ) : (
                            <View>
                                <Text style={[styles.miniLabel, {marginTop: 15}]}>Cardio Strategy</Text>
                                <View style={[styles.toggleRow, { backgroundColor: inputBg, marginBottom: 10 }]}>
                                    <TouchableOpacity style={[styles.toggleBtn, cardioMode === 'endurance' && { backgroundColor: '#8e8e93' }]} onPress={() => setCardioMode('endurance')}>
                                        <Text style={{ color: '#fff', fontSize: 10 }}>ENDURANCE</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.toggleBtn, cardioMode === 'performance' && { backgroundColor: '#FF9500' }]} onPress={() => setCardioMode('performance')}>
                                        <Text style={{ color: '#fff', fontSize: 10 }}>PERFORMANCE (TARGET)</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.row}>
                                    <View style={styles.inputWrap}><Text style={styles.label}>km</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="decimal-pad" value={distGoal} onChangeText={setDistGoal} /></View>
                                    <View style={styles.inputWrap}><Text style={styles.label}>min</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={timeGoal} onChangeText={setTimeGoal} /></View>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity style={[styles.btn, { backgroundColor: goalCategory === 'strength' ? '#007AFF' : '#c75434' }]} onPress={handleSaveGoal}>
                            <Text style={styles.btnText}>Set Achievement</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 4. WALL OF FAME */}
                    <View style={{ marginTop: 40, paddingBottom: 50 }}>
                        <Text style={[styles.sectionHeader, { color: textColor }]}>🏆 Wall of Fame</Text>
                        {completedGoals.length === 0 && <Text style={{color: '#8e8e93'}}>No trophies won yet. Get training!</Text>}
                        {completedGoals.map((goal) => (
                            <View key={goal.id} style={[styles.mileCard, { backgroundColor: cardBg }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.mileTitle, { color: textColor }]}>{goal.activity}</Text>
                                    <Text style={styles.mileSub}>Achieved: {goal.date}</Text>
                                </View>
                                <Text style={styles.mileStat}>{goal.category === 'cardio' ? goal.distance+'km' : goal.weight+'kg'}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* PICKER MODAL */}
            <Modal visible={pickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{flex: 1}} onPress={() => setPickerVisible(false)} />
                    <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
                        <ScrollView>
                            {dropdownOptions.map((opt) => (
                                <TouchableOpacity key={opt} style={styles.modalItem} onPress={() => { setActivity(opt); setIsAddingNew(false); setPickerVisible(false); }}>
                                    <Text style={[styles.modalItemText, { color: textColor }]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.modalItem} onPress={() => { setIsAddingNew(true); setActivity(''); setPickerVisible(false); }}>
                                <Text style={[styles.modalItemText, { color: '#007AFF', fontWeight: 'bold' }]}>+ Custom Activity</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    sectionHeader: { fontSize: 20, fontWeight: '900', marginBottom: 15 },
    activeCard: { flexDirection: 'row', padding: 18, borderRadius: 20, marginBottom: 10, alignItems: 'center' },
    activeTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    activeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    card: { padding: 22, borderRadius: 24, elevation: 4 },
    title: { fontSize: 20, fontWeight: '800', marginBottom: 15, textAlign: 'center' },
    toggleRow: { flexDirection: 'row', padding: 4, borderRadius: 12 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    inputWrap: { flex: 0.31 },
    label: { fontSize: 10, color: '#8e8e93', marginBottom: 5, fontWeight: 'bold' },
    input: { padding: 12, borderRadius: 10, textAlign: 'center', fontWeight: 'bold' },
    picker: { padding: 16, borderRadius: 14, alignItems: 'center' },
    btn: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    miniLabel: { fontSize: 10, fontWeight: 'bold', color: '#8e8e93', marginBottom: 5 },
    mileCard: { flexDirection: 'row', padding: 15, borderRadius: 18, marginBottom: 10, alignItems: 'center' },
    mileTitle: { fontSize: 16, fontWeight: 'bold' },
    mileSub: { fontSize: 12, color: '#8e8e93' },
    mileStat: { fontSize: 16, fontWeight: '900', color: '#c75434' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, maxHeight: '70%' },
    modalItem: { paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
    modalItemText: { fontSize: 18, textAlign: 'center' }
});