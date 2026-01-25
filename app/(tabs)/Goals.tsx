import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
    addDoc, collection, deleteDoc, doc, getDoc,
    onSnapshot, orderBy, query, serverTimestamp, setDoc, where
} from 'firebase/firestore';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

export default function GoalsPage() {
    const { user } = useContext(UserContext);
    
    // --- Pro Color Palette ---
    const colors = {
        bg: '#000000',
        card: '#0a0f0d',
        border: '#1a2e25',
        accentGreen: '#a7ff83',
        cardio: '#276749',
        strength: '#2b6cb0',
        textMain: '#FFFFFF',
        textDim: '#8e8e93'
    };

    // --- State ---
    const [loading, setLoading] = useState(false);
    const [unit, setUnit] = useState<'km' | 'mi'>('km');
    const [strengthTarget, setStrengthTarget] = useState('0');
    const [cardioTarget, setCardioTarget] = useState('0');
    const [goalCategory, setGoalCategory] = useState<'cardio' | 'strength'>('strength');
    const [activity, setActivity] = useState('');
    const [customList, setCustomList] = useState<{name: string, category: string}[]>([]);
    
    // Goal Inputs
    const [logMethod, setLogMethod] = useState<'distance' | 'speed'>('distance');
    const [isBodyweight, setIsBodyweight] = useState(false);
    const [distGoal, setDistGoal] = useState('');
    const [timeGoal, setTimeGoal] = useState('');
    const [speedGoal, setSpeedGoal] = useState(''); 
    const [loadGoal, setLoadGoal] = useState('');
    const [setsGoal, setSetsGoal] = useState('');
    const [repsGoal, setRepsGoal] = useState('');

    // Achievements State
    const [activeGoals, setActiveGoals] = useState<any[]>([]);
    const [completedGoals, setCompletedGoals] = useState<any[]>([]);
    
    // Picker/Add State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [newActivityName, setNewActivityName] = useState('');

    // --- Math: Marrying up with AddWorkout Logic ---
    const calculatedPace = useMemo(() => {
        const d = parseFloat(distGoal);
        const t = parseFloat(timeGoal);
        if (d > 0 && t > 0) {
            const paceDec = t / d;
            const mins = Math.floor(paceDec);
            const secs = Math.round((paceDec - mins) * 60);
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        return '0:00';
    }, [distGoal, timeGoal]);

    const distFromSpeed = useMemo(() => {
        const s = parseFloat(speedGoal);
        const t = parseFloat(timeGoal);
        return (s > 0 && t > 0) ? ((s * t) / 60).toFixed(2) : '0.00';
    }, [speedGoal, timeGoal]);

    useEffect(() => {
        if (!user?.uid) return;
        
        const loadSettings = async () => {
            const docSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
            if (docSnap.exists()) {
                setStrengthTarget(docSnap.data().strengthTarget?.toString() || '0');
                setCardioTarget(docSnap.data().cardioTarget?.toString() || '0');
                setUnit(docSnap.data().unit || 'km');
            }
        };
        loadSettings();

        const unsubCustom = onSnapshot(query(collection(db, 'users', user.uid, 'customEquipment')), (snap) => {
            setCustomList(snap.docs.map(d => ({ name: d.data().name, category: d.data().category })));
        });

        const unsubActive = onSnapshot(query(collection(db, 'users', user.uid, 'activeGoals'), orderBy('createdAt', 'desc')), (snap) => {
            setActiveGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Pull completed workouts where goalMet was flagged true
        const unsubDone = onSnapshot(query(collection(db, 'workouts'), where('userId', '==', user.uid), where('goalMet', '==', true), orderBy('date', 'desc')), (snap) => {
            setCompletedGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubCustom(); unsubActive(); unsubDone(); };
    }, [user]);

    const handleSaveGoal = async () => {
        if (!user?.uid) return;
        if (!activity) return Alert.alert("Selection Required", "Please choose an activity.");
        
        setLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            // Update Weekly HUD targets
            await setDoc(doc(db, 'users', user.uid, 'settings', 'goals'), {
                strengthTarget: Number(strengthTarget),
                cardioTarget: Number(cardioTarget),
                unit,
                updatedAt: serverTimestamp()
            }, { merge: true });

            const goalData: any = {
                activity,
                category: goalCategory,
                createdAt: serverTimestamp(),
                userId: user.uid,
                unit,
                focus: goalCategory === 'cardio' ? (logMethod === 'speed' ? 'performance' : 'endurance') : null,
            };

            if (goalCategory === 'strength') {
                goalData.loadGoal = Number(loadGoal) || 0;
                goalData.setsGoal = Number(setsGoal) || 0;
                goalData.repsGoal = Number(repsGoal) || 0;
                goalData.isBW = isBodyweight;
            } else {
                goalData.timeGoal = Number(timeGoal) || 0;
                if (logMethod === 'speed') {
                    goalData.speedGoal = Number(speedGoal) || 0;
                    goalData.calculatedDist = Number(distFromSpeed);
                } else {
                    goalData.distGoal = Number(distGoal) || 0;
                    goalData.targetPace = calculatedPace;
                }
            }

            await addDoc(collection(db, 'users', user.uid, 'activeGoals'), goalData);
            
            // Cleanup
            setActivity(''); setLoadGoal(''); setSetsGoal(''); setRepsGoal(''); 
            setDistGoal(''); setTimeGoal(''); setSpeedGoal('');
            setLoading(false);
        } catch (e) { 
            Alert.alert("Error", "Could not save goal."); 
            setLoading(false);
        }
    };

    const dropdownOptions = [
        ...(goalCategory === 'cardio' ? ['Running', 'Cycling', 'Rowing', 'Treadmill', 'Stairs'] : ['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Pull Ups']),
        ...customList.filter(i => i.category === goalCategory).map(i => i.name)
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* HUD SECTION: WEEKLY TARGETS */}
                    <View style={styles.hudContainer}>
                        <Text style={styles.hudTitle}>WEEKLY TARGETS</Text>
                        <View style={styles.hudCard}>
                            <View style={styles.hudBox}>
                                <Text style={styles.hudLabel}>STRENGTH</Text>
                                <TextInput style={styles.hudInput} keyboardType="numeric" value={strengthTarget} onChangeText={setStrengthTarget} />
                                <Text style={styles.hudSub}>SESSIONS</Text>
                            </View>
                            <View style={styles.hudDivider} />
                            <View style={styles.hudBox}>
                                <Text style={styles.hudLabel}>CARDIO</Text>
                                <TextInput style={styles.hudInput} keyboardType="numeric" value={cardioTarget} onChangeText={setCardioTarget} />
                                <Text style={styles.hudSub}>SESSIONS</Text>
                            </View>
                        </View>
                    </View>

                    {/* QUESTS: ACTIVE GOALS */}
                    <View style={styles.section}>
                        <Text style={styles.hudTitle}>ACTIVE QUESTS</Text>
                        {activeGoals.map((g) => (
                            <View key={g.id} style={[styles.questCard, { borderColor: g.category === 'cardio' ? colors.cardio : colors.strength }]}>
                                <View style={[styles.questIcon, { backgroundColor: g.category === 'cardio' ? colors.cardio : colors.strength }]}>
                                    <Ionicons name="trophy" size={18} color="#fff" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.questTitle}>{g.activity}</Text>
                                    <Text style={styles.questSub}>
                                        {g.category === 'strength' 
                                            ? `${g.isBW ? 'BW +' : ''} ${g.loadGoal}kg • ${g.setsGoal}x${g.repsGoal}`
                                            : g.focus === 'performance' ? `${g.speedGoal}${g.unit === 'km' ? 'km/h' : 'mph'} for ${g.timeGoal}m` : `${g.distGoal}${g.unit} in ${g.timeGoal}m`}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => deleteDoc(doc(db, 'users', user!.uid, 'activeGoals', g.id))}>
                                    <Ionicons name="trash-outline" size={18} color="#666" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {/* MAIN CONSOLE: NEW MILESTONE */}
                    <View style={styles.mainCard}>
                        <Text style={styles.mainCardTitle}>NEW MILESTONE</Text>
                        
                        <View style={styles.toggleRow}>
                            <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'strength' && { backgroundColor: colors.strength }]} onPress={() => setGoalCategory('strength')}>
                                <Text style={styles.toggleText}>STRENGTH</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.toggleBtn, goalCategory === 'cardio' && { backgroundColor: colors.cardio }]} onPress={() => setGoalCategory('cardio')}>
                                <Text style={styles.toggleText}>CARDIO</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.selector} onPress={() => setPickerVisible(true)}>
                            <Text style={{ color: activity ? '#fff' : '#666', fontWeight: 'bold' }}>{activity || "SELECT ACTIVITY"}</Text>
                            <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>

                        {goalCategory === 'cardio' ? (
                            <View>
                                <View style={styles.methodRow}>
                                    <TouchableOpacity onPress={() => setLogMethod('distance')} style={[styles.mBtn, logMethod === 'distance' && styles.mBtnActive]}>
                                        <Text style={styles.mText}>ENDURANCE</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setLogMethod('speed')} style={[styles.mBtn, logMethod === 'speed' && styles.mBtnActive]}>
                                        <Text style={styles.mText}>PERFORMANCE</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={{marginTop: 20}}>
                                    <Text style={styles.label}>TIME (MINS)</Text>
                                    <TextInput style={styles.mainInput} keyboardType="numeric" value={timeGoal} onChangeText={setTimeGoal} />
                                    
                                    <View style={styles.unitHeader}>
                                         <Text style={styles.label}>{logMethod === 'distance' ? `DISTANCE (${unit})` : `SPEED (${unit === 'km' ? 'km/h' : 'mph'})`}</Text>
                                         <TouchableOpacity onPress={() => setUnit(unit === 'km' ? 'mi' : 'km')}>
                                            <Text style={styles.unitLink}>SWITCH TO {unit === 'km' ? 'MI' : 'KM'}</Text>
                                         </TouchableOpacity>
                                    </View>
                                    <TextInput style={styles.mainInput} keyboardType="decimal-pad" value={logMethod === 'distance' ? distGoal : speedGoal} onChangeText={logMethod === 'distance' ? setDistGoal : setSpeedGoal} />
                                    <Text style={styles.previewText}>{logMethod === 'distance' ? `Target Pace: ${calculatedPace}/${unit}` : `Goal Distance: ${distFromSpeed} ${unit}`}</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={{ marginTop: 20 }}>
                                <TouchableOpacity 
                                    style={[styles.miniBtn, isBodyweight && { backgroundColor: colors.strength, borderColor: colors.strength }]} 
                                    onPress={() => setIsBodyweight(!isBodyweight)}
                                >
                                    <Text style={styles.mText}>{isBodyweight ? "BODYWEIGHT MODE ON" : "USE BODYWEIGHT?"}</Text>
                                </TouchableOpacity>

                                <View style={styles.inputRow}>
                                    <View style={styles.inputStack}><Text style={styles.label}>{isBodyweight ? '+ KG' : 'KG'}</Text><TextInput style={styles.mainInput} keyboardType="numeric" value={loadGoal} onChangeText={setLoadGoal} /></View>
                                    <View style={styles.inputStack}><Text style={styles.label}>SETS</Text><TextInput style={styles.mainInput} keyboardType="numeric" value={setsGoal} onChangeText={setSetsGoal} /></View>
                                    <View style={styles.inputStack}><Text style={styles.label}>REPS</Text><TextInput style={styles.mainInput} keyboardType="numeric" value={repsGoal} onChangeText={setRepsGoal} /></View>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accentGreen }]} onPress={handleSaveGoal} disabled={loading}>
                            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>LOCK IN GOAL</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* COMPLETED MILESTONES */}
                    {completedGoals.length > 0 && (
                        <View style={[styles.section, { marginTop: 40 }]}>
                            <Text style={[styles.hudTitle, { color: '#FFD700' }]}>COMPLETED MILESTONES</Text>
                            {completedGoals.map((goal) => (
                                <View key={goal.id} style={styles.completedCard}>
                                    <View style={styles.completedIcon}>
                                        <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 15 }}>
                                        <Text style={styles.completedTitle}>{goal.activity}</Text>
                                        <Text style={styles.completedSub}>
                                            {goal.category === 'strength' 
                                                ? `Lifted ${goal.metricValue}kg • ${new Date(goal.createdAt?.seconds * 1000).toLocaleDateString()}`
                                                : `Reached ${goal.calculatedDistance}${goal.unit} • ${new Date(goal.createdAt?.seconds * 1000).toLocaleDateString()}`}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ACTIVITY PICKER MODAL */}
            <Modal visible={pickerVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>CHOOSE ACTIVITY</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        <View style={styles.modalAddRow}>
                            <TextInput style={styles.modalInput} placeholder="Create custom..." placeholderTextColor="#444" value={newActivityName} onChangeText={setNewActivityName} />
                            <TouchableOpacity onPress={async () => { 
                                if(!newActivityName) return; 
                                await addDoc(collection(db, 'users', user!.uid, 'customEquipment'), { name: newActivityName.trim(), category: goalCategory });
                                setActivity(newActivityName.trim());
                                setNewActivityName('');
                                setPickerVisible(false);
                            }}>
                                <Ionicons name="add-circle" size={40} color={colors.accentGreen} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {dropdownOptions.map((opt) => (
                                <TouchableOpacity key={opt} style={styles.modalItem} onPress={() => { setActivity(opt); setPickerVisible(false); }}>
                                    <Text style={styles.modalItemText}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#000' },
    scrollContent: { padding: 20 },
    hudContainer: { marginBottom: 30 },
    hudTitle: { color: '#a7ff83', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12, marginLeft: 5 },
    hudCard: { flexDirection: 'row', backgroundColor: 'rgba(26, 46, 37, 0.3)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1a2e25' },
    hudBox: { flex: 1, alignItems: 'center' },
    hudLabel: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
    hudInput: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center' },
    hudSub: { color: '#444', fontSize: 9, fontWeight: 'bold', marginTop: 4 },
    hudDivider: { width: 1, backgroundColor: '#1a2e25', marginHorizontal: 15 },
    section: { marginBottom: 30 },
    questCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0f0d', padding: 15, borderRadius: 18, marginBottom: 10, borderWidth: 1 },
    questIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    questTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    questSub: { color: '#8e8e93', fontSize: 12, marginTop: 2 },
    mainCard: { backgroundColor: '#0a0f0d', padding: 25, borderRadius: 32, borderWidth: 1.5, borderColor: '#1a2e25' },
    mainCardTitle: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
    toggleRow: { flexDirection: 'row', backgroundColor: '#000', padding: 5, borderRadius: 16, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    toggleText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    selector: { backgroundColor: '#000', padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1a2e25' },
    methodRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
    mBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#1a2e25', alignItems: 'center' },
    mBtnActive: { backgroundColor: 'rgba(167, 255, 131, 0.1)', borderColor: '#a7ff83' },
    miniBtn: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#1a2e25', alignItems: 'center', marginBottom: 15 },
    mText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
    inputStack: { flex: 0.31 },
    label: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
    mainInput: { backgroundColor: '#000', color: '#fff', padding: 18, borderRadius: 15, fontSize: 18, fontWeight: 'bold', textAlign: 'center', borderWidth: 1, borderColor: '#1a2e25' },
    unitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, alignItems: 'center' },
    unitLink: { color: '#a7ff83', fontSize: 10, fontWeight: 'bold' },
    previewText: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
    saveBtn: { padding: 20, borderRadius: 20, marginTop: 30, alignItems: 'center' },
    saveBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
    completedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.05)', padding: 15, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.1)' },
    completedIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 215, 0, 0.1)' },
    completedTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    completedSub: { color: '#8e8e93', fontSize: 11, marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#0a0f0d', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, maxHeight: '85%', borderWidth: 1, borderColor: '#1a2e25' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    modalAddRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
    modalInput: { flex: 1, backgroundColor: '#000', padding: 15, borderRadius: 15, color: '#fff' },
    modalItem: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1a2e25' },
    modalItemText: { color: '#fff', fontSize: 18, textAlign: 'center' }
});