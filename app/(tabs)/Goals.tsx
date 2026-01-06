import { db } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
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
    const [activity, setActivity] = useState('');
    const [customList, setCustomList] = useState<{name: string, category: string}[]>([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newActivityName, setNewActivityName] = useState('');
    
    // UI State for Custom Picker
    const [pickerVisible, setPickerVisible] = useState(false);
    
    // Metrics
    const [distGoal, setDistGoal] = useState('');
    const [timeGoal, setTimeGoal] = useState('');
    const [loadGoal, setLoadGoal] = useState('');
    const [setsGoal, setSetsGoal] = useState('');
    const [repsGoal, setRepsGoal] = useState('');

    // Lists State
    const [activeGoals, setActiveGoals] = useState<any[]>([]);
    const [completedGoals, setCompletedGoals] = useState<any[]>([]);

    const cardioStandards = ['Running', 'Cycling', 'Rowing', 'SkiERG', 'Swimming', 'Walking'];
    const strengthStandards = ['Dumbbells', 'Barbell', 'Leg Press', 'Cables', 'Kettlebell'];

    // 1. Fetch Frequency Targets & Custom Library
    useEffect(() => {
        if (!user?.uid) return;
        
        // Load Frequency Settings
        const loadSettings = async () => {
            const docSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
            if (docSnap.exists()) {
                setStrengthTarget(docSnap.data().strengthTarget?.toString() || '0');
                setCardioTarget(docSnap.data().cardioTarget?.toString() || '0');
            }
        };
        loadSettings();

        // Listen for Custom Equipment
        const qCustom = query(collection(db, 'users', user.uid, 'customEquipment'));
        const unsubCustom = onSnapshot(qCustom, (snapshot) => {
            setCustomList(snapshot.docs.map(doc => ({
                name: doc.data().name,
                category: doc.data().category
            })));
        });

        // Listen for Active Achievement Goals
        const qActive = query(collection(db, 'users', user.uid, 'activeGoals'), orderBy('createdAt', 'desc'));
        const unsubActive = onSnapshot(qActive, (snapshot) => {
            setActiveGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Listen for Completed Milestones (Wall of Fame)
        const qDone = query(
            collection(db, 'workouts'),
            where('userId', '==', user.uid),
            where('goalMet', '==', true),
            orderBy('date', 'desc')
        );
        const unsubDone = onSnapshot(qDone, (snapshot) => {
            setCompletedGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubCustom(); unsubActive(); unsubDone(); };
    }, [user]);

    const handleSaveGoal = async () => {
        if (!user?.uid) return;
        const finalActivity = isAddingNew ? newActivityName.trim() : activity;
        if (!finalActivity) { Alert.alert("Error", "Please select or type an activity."); return; }
        
        try {
            // Save Frequency to settings
            await setDoc(doc(db, 'users', user.uid, 'settings', 'goals'), {
                strengthTarget: Number(strengthTarget),
                cardioTarget: Number(cardioTarget),
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Save the specific Achievement Goal to the active list
            const goalData: any = {
                activity: finalActivity,
                category: goalCategory,
                createdAt: serverTimestamp(),
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

            // If it was a new custom activity, save to library
            if (isAddingNew) {
                await setDoc(doc(db, 'users', user.uid, 'customEquipment', finalActivity), {
                    name: finalActivity,
                    category: goalCategory,
                    createdAt: serverTimestamp()
                });
            }

            Alert.alert("Success", "Goal activated!");
            // Reset Editor
            setActivity(''); setDistGoal(''); setTimeGoal(''); setLoadGoal(''); setSetsGoal(''); setRepsGoal('');
            setIsAddingNew(false); setNewActivityName('');
        } catch (e) { Alert.alert("Error", "Failed to activate goal."); }
    };

    const deleteActiveGoal = async (id: string) => {
        if (!user?.uid) return;
        await deleteDoc(doc(db, 'users', user.uid, 'activeGoals', id));
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
            <ScrollView contentContainerStyle={[styles.container, { backgroundColor: isDark ? '#121212' : '#f9fafb' }]}>
                
                {/* 1. ACTIVE TARGETS LIST */}
                <Text style={[styles.sectionHeader, { color: textColor }]}>🎯 Active Targets</Text>
                {activeGoals.map((g) => (
                    <View key={g.id} style={[styles.activeStatusCard, { backgroundColor: g.category === 'cardio' ? '#34C759' : '#007AFF' }]}>
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusLabel}>{g.category.toUpperCase()} GOAL</Text>
                            <Text style={styles.statusTitle}>{g.activity}</Text>
                            <Text style={styles.statusMetrics}>
                                {g.category === 'cardio' ? (
                                    `${g.distGoal > 0 ? g.distGoal+'km ' : ''}${g.timeGoal > 0 ? '• '+g.timeGoal+'m' : ''}`
                                ) : (
                                    `${g.loadGoal > 0 ? g.loadGoal+'kg • ' : ''}${g.setsGoal}x${g.repsGoal}`
                                )}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteActiveGoal(g.id)} style={styles.deleteCircle}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                {/* 2. EDITOR CARD */}
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <Text style={[styles.title, { color: textColor }]}>Set New Goal</Text>
                    
                    <Text style={styles.sectionLabel}>Weekly Frequency</Text>
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

                    <Text style={styles.sectionLabel}>Achievement Metrics</Text>
                    <View style={[styles.toggleRow, { backgroundColor: inputBg }]}>
                        <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'strength' && { backgroundColor: '#007AFF' }]} onPress={() => {setGoalCategory('strength'); setActivity('');}}>
                            <Text style={{ color: goalCategory === 'strength' ? '#fff' : '#8e8e93', fontWeight: 'bold' }}>STRENGTH</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'cardio' && { backgroundColor: '#34C759' }]} onPress={() => {setGoalCategory('cardio'); setActivity('');}}>
                            <Text style={{ color: goalCategory === 'cardio' ? '#fff' : '#8e8e93', fontWeight: 'bold' }}>CARDIO</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.pickerTrigger, { backgroundColor: inputBg }]} onPress={() => setPickerVisible(true)}>
                        <Text style={{ color: activity ? textColor : '#8e8e93', fontWeight: 'bold' }}>{activity || "Select Activity..."}</Text>
                        <Text style={{ color: '#8e8e93' }}>▼</Text>
                    </TouchableOpacity>

                    {isAddingNew && (
                        <TextInput 
                            style={[styles.input, { color: textColor, backgroundColor: inputBg, marginTop: 10, borderWidth: 1, borderColor: '#007AFF' }]} 
                            placeholder="Type Activity Name..." 
                            placeholderTextColor="#8e8e93"
                            value={newActivityName} 
                            onChangeText={setNewActivityName} 
                        />
                    )}

                    {goalCategory === 'cardio' ? (
                        <View style={styles.row}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Min Dist (km)</Text>
                                <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="decimal-pad" value={distGoal} onChangeText={setDistGoal} placeholder="0" />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Min Time (min)</Text>
                                <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={timeGoal} onChangeText={setTimeGoal} placeholder="0" />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 5 }}>
                                <Text style={styles.label}>Load (kg)</Text>
                                <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={loadGoal} onChangeText={setLoadGoal} placeholder="0" />
                            </View>
                            <View style={{ flex: 1, marginRight: 5 }}>
                                <Text style={styles.label}>Sets</Text>
                                <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={setsGoal} onChangeText={setSetsGoal} placeholder="0" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Reps</Text>
                                <TextInput style={[styles.input, { color: textColor, backgroundColor: inputBg }]} keyboardType="numeric" value={repsGoal} onChangeText={setRepsGoal} placeholder="0" />
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.btn} onPress={handleSaveGoal}>
                        <Text style={styles.btnText}>Activate Trophy Goal</Text>
                    </TouchableOpacity>
                </View>

                {/* 3. WALL OF FAME */}
                <View style={styles.milestoneSection}>
                    <Text style={[styles.sectionHeader, { color: textColor }]}>🏆 Wall of Fame</Text>
                    {completedGoals.map((goal) => (
                        <View key={goal.id} style={[styles.milestoneCard, { backgroundColor: cardBg }]}>
                            <View style={styles.milestoneIcon}><Text style={{ fontSize: 24 }}>🏆</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.milestoneTitle, { color: textColor }]}>{goal.activity}</Text>
                                <Text style={styles.milestoneSub}>Hit on {goal.date}</Text>
                            </View>
                            <View style={styles.milestoneStats}>
                                <Text style={styles.statText}>
                                    {goal.distance ? goal.distance+'km' : goal.load+'kg'}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* SELECTION MODAL */}
            <Modal visible={pickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{flex: 1}} onPress={() => setPickerVisible(false)} />
                    <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHandle} />
                        <Text style={[styles.modalTitle, { color: textColor }]}>Select Activity</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
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
    container: { flexGrow: 1, padding: 20 },
    sectionHeader: { fontSize: 18, fontWeight: '900', marginBottom: 15, paddingLeft: 5 },
    card: { padding: 25, borderRadius: 28, elevation: 8, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: '#007AFF', marginBottom: 12, textTransform: 'uppercase' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    inputGroup: { flex: 0.47 },
    toggleRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    label: { fontSize: 10, fontWeight: '700', color: '#8e8e93', marginBottom: 6, textTransform: 'uppercase' },
    input: { padding: 12, borderRadius: 12, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    divider: { height: 1, backgroundColor: 'rgba(142, 142, 147, 0.2)', marginVertical: 20 },
    btn: { backgroundColor: '#34C759', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 15 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    pickerTrigger: { height: 55, borderRadius: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    
    // Active Goal Cards
    activeStatusCard: { flexDirection: 'row', padding: 18, borderRadius: 22, marginBottom: 12, alignItems: 'center', elevation: 4 },
    statusInfo: { flex: 1 },
    statusLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    statusTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    statusMetrics: { color: '#fff', fontSize: 13, fontWeight: '600' },
    deleteCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
    modalHandle: { width: 40, height: 5, backgroundColor: '#8e8e93', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#38383a' },
    modalItemText: { fontSize: 18, textAlign: 'center' },

    // Wall of Fame
    milestoneSection: { marginTop: 10, paddingBottom: 40 },
    milestoneCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, marginBottom: 12 },
    milestoneIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 215, 0, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    milestoneTitle: { fontSize: 16, fontWeight: 'bold' },
    milestoneSub: { fontSize: 12, color: '#8e8e93' },
    milestoneStats: { alignItems: 'flex-end' },
    statText: { fontSize: 14, fontWeight: '900', color: '#34C759' }
});