import { db } from '@/firebase';
import {
    addDoc,
    collection, deleteDoc, doc,
    getDoc,
    onSnapshot, orderBy, query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View
} from 'react-native';
import { UserContext } from '../../context/UserContext';

export default function GoalsPage() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    // Frequency targets (Weekly)
    const [strengthTarget, setStrengthTarget] = useState('0');
    const [cardioTarget, setCardioTarget] = useState('0');
    
    // Activity Selection
    const [goalCategory, setGoalCategory] = useState<'cardio' | 'strength'>('cardio');
    const [activity, setActivity] = useState('');
    const [customList, setCustomList] = useState<{name: string, category: string}[]>([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newActivityName, setNewActivityName] = useState('');
    const [pickerVisible, setPickerVisible] = useState(false);
    
    // Achievement Metrics
    const [distGoal, setDistGoal] = useState('');
    const [timeGoal, setTimeGoal] = useState('');
    const [loadGoal, setLoadGoal] = useState('');
    const [setsGoal, setSetsGoal] = useState('');
    const [repsGoal, setRepsGoal] = useState('');

    // Goal Lists
    const [activeGoals, setActiveGoals] = useState<any[]>([]);
    const [completedGoals, setCompletedGoals] = useState<any[]>([]);

    const cardioStandards = ['Running', 'Cycling', 'Rowing', 'SkiERG', 'Swimming', 'Walking'];
    const strengthStandards = ['Dumbbells', 'Barbell', 'Leg Press', 'Cables', 'Kettlebell'];

    useEffect(() => {
        if (!user?.uid) return;
        
        // 1. Weekly Settings
        const loadSettings = async () => {
            const docSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
            if (docSnap.exists()) {
                setStrengthTarget(docSnap.data().strengthTarget?.toString() || '0');
                setCardioTarget(docSnap.data().cardioTarget?.toString() || '0');
            }
        };
        loadSettings();

        // 2. Custom Library
        const unsubCustom = onSnapshot(query(collection(db, 'users', user.uid, 'customEquipment')), (snap) => {
            setCustomList(snap.docs.map(d => ({ name: d.data().name, category: d.data().category })));
        });

        // 3. Active Trophy Goals
        const unsubActive = onSnapshot(query(collection(db, 'users', user.uid, 'activeGoals'), orderBy('createdAt', 'desc')), (snap) => {
            setActiveGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 4. Wall of Fame (Completed)
        const unsubDone = onSnapshot(query(collection(db, 'workouts'), where('userId', '==', user.uid), where('goalMet', '==', true), orderBy('date', 'desc')), (snap) => {
            setCompletedGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubCustom(); unsubActive(); unsubDone(); };
    }, [user]);

    const handleSaveGoal = async () => {
        if (!user?.uid) return;
        const finalActivity = isAddingNew ? newActivityName.trim() : activity;
        if (!finalActivity) { Alert.alert("Missing Info", "Please select an activity."); return; }
        
        try {
            // Save Weekly Frequency
            await setDoc(doc(db, 'users', user.uid, 'settings', 'goals'), {
                strengthTarget: Number(strengthTarget),
                cardioTarget: Number(cardioTarget),
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Create the specific Achievement Object
            const goalData: any = {
                activity: finalActivity,
                category: goalCategory,
                createdAt: serverTimestamp(),
                userId: user.uid, // Useful for queries
            };

            if (goalCategory === 'cardio') {
                goalData.distGoal = Number(distGoal) || 0;
                goalData.timeGoal = Number(timeGoal) || 0;
            } else {
                goalData.loadGoal = Number(loadGoal) || 0;
                goalData.setsGoal = Number(setsGoal) || 0;
                goalData.repsGoal = Number(repsGoal) || 0;
            }

            await addDoc(collection(db, 'users', user.uid, 'activeGoals'), goalData);

            if (isAddingNew) {
                await setDoc(doc(db, 'users', user.uid, 'customEquipment', finalActivity), {
                    name: finalActivity,
                    category: goalCategory
                });
            }

            Alert.alert("Goal Set!", "This target is now active. Go log a workout to hit it!");
            setActivity(''); setDistGoal(''); setTimeGoal(''); setLoadGoal(''); setSetsGoal(''); setRepsGoal('');
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                
                {/* ACTIVE LIST */}
                <Text style={[styles.sectionHeader, { color: textColor }]}>🎯 Active Achievement Goals</Text>
                {activeGoals.length === 0 && <Text style={{color: '#8e8e93', marginBottom: 20}}>No trophies currently being chased.</Text>}
                {activeGoals.map((g) => (
                    <View key={g.id} style={[styles.activeCard, { backgroundColor: g.category === 'cardio' ? '#34C759' : '#007AFF' }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.activeTitle}>{g.activity}</Text>
                            <Text style={styles.activeSub}>
                                {g.category === 'cardio' 
                                    ? `${g.distGoal > 0 ? g.distGoal+'km ' : ''}${g.timeGoal > 0 ? '• '+g.timeGoal+'min' : ''}`
                                    : `${g.loadGoal > 0 ? g.loadGoal+'kg • ' : ''}${g.setsGoal} Sets x ${g.repsGoal} Reps`
                                }
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteDoc(doc(db, 'users', user!.uid, 'activeGoals', g.id))}>
                            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                {/* EDITOR */}
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <Text style={[styles.title, { color: textColor }]}>New Target</Text>
                    
                    <Text style={styles.miniLabel}>Weekly Frequency</Text>
                    <View style={styles.row}>
                        <View style={styles.inputWrap}>
                            <Text style={styles.label}>Strength/wk</Text>
                            <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={strengthTarget} onChangeText={setStrengthTarget} />
                        </View>
                        <View style={styles.inputWrap}>
                            <Text style={styles.label}>Cardio/wk</Text>
                            <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={cardioTarget} onChangeText={setCardioTarget} />
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.miniLabel}>Select Activity</Text>
                    <View style={[styles.toggleRow, { backgroundColor: inputBg }]}>
                        <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'strength' && { backgroundColor: '#007AFF' }]} onPress={() => {setGoalCategory('strength'); setActivity('');}}>
                            <Text style={{ color: goalCategory === 'strength' ? '#fff' : '#8e8e93', fontWeight: 'bold' }}>STRENGTH</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'cardio' && { backgroundColor: '#34C759' }]} onPress={() => {setGoalCategory('cardio'); setActivity('');}}>
                            <Text style={{ color: goalCategory === 'cardio' ? '#fff' : '#8e8e93', fontWeight: 'bold' }}>CARDIO</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.picker, { backgroundColor: inputBg }]} onPress={() => setPickerVisible(true)}>
                        <Text style={{ color: activity ? textColor : '#8e8e93', fontWeight: 'bold' }}>{activity || "Choose Exercise..."}</Text>
                        <Text style={{ color: '#8e8e93' }}>▼</Text>
                    </TouchableOpacity>

                    {isAddingNew && (
                        <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg, marginTop: 10, borderWidth: 1, borderColor: '#007AFF' }]} placeholder="Activity Name..." placeholderTextColor="#8e8e93" value={newActivityName} onChangeText={setNewActivityName} />
                    )}

                    <Text style={[styles.miniLabel, { marginTop: 15 }]}>Achievement Metrics</Text>
                    {goalCategory === 'cardio' ? (
                        <View style={styles.row}>
                            <View style={styles.inputWrap}><Text style={styles.label}>Dist (km)</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="decimal-pad" value={distGoal} onChangeText={setDistGoal} /></View>
                            <View style={styles.inputWrap}><Text style={styles.label}>Time (min)</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={timeGoal} onChangeText={setTimeGoal} /></View>
                        </View>
                    ) : (
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 5 }}><Text style={styles.label}>kg</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={loadGoal} onChangeText={setLoadGoal} /></View>
                            <View style={{ flex: 1, marginRight: 5 }}><Text style={styles.label}>Sets</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={setsGoal} onChangeText={setSetsGoal} /></View>
                            <View style={{ flex: 1 }}><Text style={styles.label}>Reps</Text><TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={repsGoal} onChangeText={setRepsGoal} /></View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.btn} onPress={handleSaveGoal}><Text style={styles.btnText}>Activate Goal</Text></TouchableOpacity>
                </View>

                {/* WALL OF FAME */}
                <View style={{ marginTop: 30, paddingBottom: 50 }}>
                    <Text style={[styles.sectionHeader, { color: textColor }]}>🏆 Wall of Fame</Text>
                    {completedGoals.map((goal) => (
                        <View key={goal.id} style={[styles.mileCard, { backgroundColor: cardBg }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.mileTitle, { color: textColor }]}>{goal.activity}</Text>
                                <Text style={styles.mileSub}>Completed on {goal.date}</Text>
                            </View>
                            <Text style={styles.mileStat}>{goal.category === 'cardio' ? goal.distance+'km' : goal.weight+'kg'}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

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
                                <Text style={[styles.modalItemText, { color: '#007AFF', fontWeight: 'bold' }]}>+ Add New Custom...</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    sectionHeader: { fontSize: 20, fontWeight: '900', marginBottom: 15 },
    activeCard: { flexDirection: 'row', padding: 20, borderRadius: 24, marginBottom: 12, alignItems: 'center' },
    activeTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    activeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
    card: { padding: 25, borderRadius: 28, elevation: 5 },
    title: { fontSize: 22, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
    miniLabel: { fontSize: 11, fontWeight: '800', color: '#007AFF', marginBottom: 10, textTransform: 'uppercase' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    inputWrap: { flex: 0.48 },
    label: { fontSize: 10, color: '#8e8e93', marginBottom: 5, textTransform: 'uppercase' },
    input: { padding: 14, borderRadius: 14, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    divider: { height: 1, backgroundColor: 'rgba(142, 142, 147, 0.1)', marginVertical: 20 },
    toggleRow: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    picker: { padding: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    btn: { backgroundColor: '#34C759', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    mileCard: { flexDirection: 'row', padding: 18, borderRadius: 20, marginBottom: 10, alignItems: 'center' },
    mileTitle: { fontSize: 16, fontWeight: 'bold' },
    mileSub: { fontSize: 12, color: '#8e8e93' },
    mileStat: { fontSize: 16, fontWeight: '900', color: '#34C759' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
    modalItem: { paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: '#333' },
    modalItemText: { fontSize: 18, textAlign: 'center' }
});