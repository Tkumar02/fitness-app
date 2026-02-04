import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import {
    collection, deleteDoc, doc, onSnapshot, orderBy,
    query, serverTimestamp, updateDoc, where
} from 'firebase/firestore';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, FlatList, Modal, Platform,
    RefreshControl, ScrollView, StyleSheet, Text,
    TextInput,
    TouchableOpacity, useColorScheme, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../../context/UserContext';

export default function ReviewProgression() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    const webDateRef = useRef<any>(null); 
    
    // Core States
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
    
    // Filter States
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'strength' | 'cardio'>('all');
    const [selectedActivity, setSelectedActivity] = useState<string>('All Exercises');
    const [activityPickerVisible, setActivityPickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Edit States
    const [editingWorkout, setEditingWorkout] = useState<any>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editDate, setEditDate] = useState<string>('');
    const [editSets, setEditSets] = useState('');
    const [editReps, setEditReps] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editDuration, setEditDuration] = useState('');
    const [editDistance, setEditDistance] = useState('');
    const [editIntensity, setEditIntensity] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editunit, setEditunit] = useState<string>('km');
    const [editWeightUnit, setEditWeightUnit] = useState<'kg' | 'lbs'>('kg');

    const theme = {
        background: isDark ? '#121212' : '#f9fafb',
        card: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#ffffff' : '#000000',
        subtext: '#8e8e93',
        accent: '#007AFF',
        success: '#34C759',
        inputBg: isDark ? '#2c2c2e' : '#f2f2f7'
    };

    const getRPEColor = (rpe: number) => {
        if (rpe <= 6) return '#34C759'; 
        if (rpe <= 8) return '#FF9500';
        return '#FF3B30';
    };

    // 1. Sync Data
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'workouts'), where('userId', '==', user.uid), orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            setWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
            setRefreshing(false);
        });
        return () => unsub();
    }, [user]);

    // 2. Logic & Filters
    const filteredWorkouts = useMemo(() => {
        return workouts.filter(w => {
            const matchesCat = categoryFilter === 'all' || w.category === categoryFilter;
            const matchesAct = selectedActivity === 'All Exercises' || w.activity === selectedActivity;
            const matchesDate = !selectedDate || w.date === selectedDate.toISOString().split('T')[0];
            return matchesCat && matchesAct && matchesDate;
        });
    }, [workouts, categoryFilter, selectedActivity, selectedDate]);

    const uniqueActivities = useMemo(() => 
        ['All Exercises', ...Array.from(new Set(workouts.map(w => w.activity)))].sort(), 
    [workouts]);

    // 3. Handlers
    const handleDateTrigger = () => {
        if (Platform.OS === 'web') {
            webDateRef.current?.showPicker();
        } else {
            setShowDatePicker(true);
        }
    };

const handleUpdate = async () => {
    if (!editingWorkout) return;
    try {
await updateDoc(doc(db, 'workouts', editingWorkout.id), {
    date: editDate, 
    sets: Number(editSets) || 0,
    reps: Number(editReps) || 0,
    // Safely handles the units
    // Updated save logic to handle cardio metrics correctly
    ...(editingWorkout.category === 'strength' ? { 
        weightUnit: editWeightUnit,
        sets: Number(editSets) || 0,
        reps: Number(editReps) || 0,
        ...(editingWorkout.isBW 
            ? { addedWeight: Number(editWeight) || 0, weight: 0 } 
            : { weight: Number(editWeight) || 0, addedWeight: 0 })
    } : { 
        // Cardio Save Logic
        ...(editingWorkout.metricType === 'DISTANCE' 
            ? { 
            // If it's a speed workout (includes /h), recalculate the hidden distance field
            distance: editunit.includes('/h') 
                ? Number((Number(editDistance) * (Number(editDuration) / 60)).toFixed(2)) 
                : Number(editDistance), 
            unit: editunit,
            // Also update metricValue so the speed is preserved
            metricValue: editunit.includes('/h') ? Number(editDistance) : 0
          } 
        : { metricValue: Number(editDistance) || 0 })
    }),
    duration: Number(editDuration) || 0,
    rpe: Number(editIntensity) || 0,
    notes: editNotes,
    updatedAt: serverTimestamp()
});
        setEditModalVisible(false);
    } catch (e) { 
        Alert.alert("Error", "Update failed"); 
    }
};

    const handleDelete = async (id: string) => {
        const performDelete = async () => await deleteDoc(doc(db, 'workouts', id));
        if (Platform.OS === 'web') { if (window.confirm("Delete?")) performDelete(); }
        else { Alert.alert("Delete", "Sure?", [{ text: "No" }, { text: "Yes", onPress: performDelete, style: 'destructive' }]); }
    };

    // 4. Render Item
    const renderWorkoutItem = ({ item }: { item: any }) => {

        const isNoteExpanded = expandedNotes[item.id];
        const rpeValue = item.intensity || item.rpe;
        // Use 'weight' for normal lifts, 'addedWeight' for Bodyweight exercises
        const effectiveWeight = item.isBW ? (Number(item.addedWeight) || 0) : (Number(item.weight) || 0);
    
        // Calculate 1RM and Volume based on the effective weight
        const c1RM = effectiveWeight > 0 ? Math.round(effectiveWeight * (1 + Number(item.reps) / 30)) : 0;
        const totalVolume = (Number(item.sets) * Number(item.reps) * effectiveWeight) || 0;

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.dateText}>{item.date}</Text>
                        {!!rpeValue && (
                            <View style={[styles.rpeBadge, { backgroundColor: getRPEColor(Number(rpeValue)) + '20' }]}>
                                <Text style={[styles.rpeBadgeText, { color: getRPEColor(Number(rpeValue)) }]}>RPE {rpeValue}</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {item.goalMet ? <Text style={{marginRight: 12}}>🏆</Text> : null}
                        <TouchableOpacity onPress={() => {
                            setEditingWorkout(item);
                            setEditDate(item.date); // ADD THIS LINE
                            setEditSets(item.sets?.toString() || '');
                            setEditReps(item.reps?.toString() || '');
                            setEditWeight(item.weight?.toString() || '');
                            setEditWeightUnit(item.weightUnit || 'kg')
                            setEditunit(item.unit || 'km')
                            setEditDuration(item.duration?.toString() || '');
                            setEditIntensity(rpeValue?.toString() || '');
                            setEditNotes(item.notes || ''); 
                            setEditModalVisible(true);
                            const displayValue = item.metricType === 'DISTANCE' ? item.distance : item.metricValue;
    setEditDistance(displayValue?.toString() || '');
                        }}><Ionicons name="create-outline" size={20} color={theme.accent} style={{marginRight: 15}} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={18} color={theme.subtext} /></TouchableOpacity>
                    </View>
                </View>

                <Text style={[styles.activityTitle, { color: theme.text }]}>{item.activity}</Text>
                
                <View style={styles.statsRow}>
                    {item.category === 'strength' ? (
                        <>
        <View>
            <Text style={styles.statLabel}>Sets</Text>
            <Text style={[styles.statValue, {color: theme.text}]}>{item.sets}</Text>
        </View>
        <View>
            <Text style={styles.statLabel}>Reps</Text>
            <Text style={[styles.statValue, {color: theme.text}]}>{item.reps}</Text>
        </View>
        <View>
            <Text style={styles.statLabel}>Weight</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.statValue, {color: theme.accent}]}>
{item.isBW ? (
                item.addedWeight > 0 
                    ? `BW + ${item.addedWeight}${item.weightUnit || 'kg'}` 
                    : 'BW'
            ) : (
                `${item.weight}${item.weightUnit || 'kg'}`
            )}
                </Text>
            </View>
        </View>
    </>
) : (
// Inside the cardio branch of renderWorkoutItem:
<>
    <View>
        <Text style={styles.statLabel}>Min</Text>
        <Text style={[styles.statValue, {color: theme.success}]}>{item.duration}</Text>
    </View>
 <View>
     <Text style={styles.statLabel}>
         {/* Use metricType (FLOORS/LEVEL) if it exists, otherwise default to unit (KM/MI) */}
         {item.metricType && item.metricType !== 'DISTANCE' ? item.metricType : (item.unit?.toUpperCase() || 'KM')}
     </Text>
     <Text style={[styles.statValue, {color: theme.success}]}>
         {/* Logical OR: Show metricValue if it exists (>0), otherwise show distance */}
         {(item.metricValue > 0 ? item.metricValue : item.distance) || 0}
     </Text>
 </View>
</>
                    )}
                </View>

                <View style={[styles.performanceRow, { borderTopColor: isDark ? '#333' : '#eee' }]}>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                    {item.category === 'strength' ? (
                        <>
                            {/* ONLY SHOW IF GREATER THAN 0 */}
                            {c1RM > 0 && (
<Text style={[styles.performanceText, { color: theme.text }]}>
    1RM: {c1RM}{item.weightUnit || 'kg'}
</Text>
                            )}
                            {totalVolume > 0 && (
                                <Text style={[styles.performanceText, { color: theme.subtext }]}>
                                    Vol: <Text style={{ color: theme.text }}>{totalVolume.toLocaleString()}{item.weightUnit || 'kg'}</Text>
                                </Text>
                            )}
                            {/* IF BOTH ARE 0 (Standard BW), show a simple label */}
                            {c1RM === 0 && totalVolume === 0 && (
                                <Text style={[styles.performanceText, { color: theme.subtext }]}>Bodyweight Session</Text>
                            )}
                        </>
                    ) : (
                        <Text style={[styles.performanceText, { color: theme.subtext }]}>Type: Cardio</Text>
                    )}
                </View>
                    {item.notes && (
                        <TouchableOpacity style={styles.notesBtn} onPress={() => setExpandedNotes(prev => ({...prev, [item.id]: !prev[item.id]}))}>
                            <Text style={styles.notesBtnText}>{isNoteExpanded ? 'Hide' : 'Notes'}</Text>
                            <Ionicons name="document-text-outline" size={14} color={theme.accent} />
                        </TouchableOpacity>
                    )}
                </View>

                {isNoteExpanded && (
                    <View style={[styles.notesContent, { backgroundColor: theme.inputBg }]}>
                        <Text style={[styles.notesText, { color: theme.text }]}>{item.notes}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={isDark ? ['#1a1a1a', '#121212'] : ['#f0f2f5', '#ffffff']} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.container}>
                    <Text style={[styles.header, { color: theme.text }]}>Progression</Text>

                    {/* HIDDEN WEB INPUT - REINSTATED */}
                    {Platform.OS === 'web' && (
                        <input 
                            type="date" 
                            ref={webDateRef} 
                            style={{position:'absolute', opacity:0, zIndex:-1}} 
                            onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value))} 
                        />
                    )}

                    {/* FILTERS */}
                    <View style={styles.toggleContainer}>
                        {(['all', 'strength', 'cardio'] as const).map((t) => (
                            <TouchableOpacity key={t} style={[styles.toggleBtn, categoryFilter === t && (isDark ? styles.activeToggleDark : styles.activeToggleLight)]} onPress={() => setCategoryFilter(t)}>
                                <Text style={[styles.toggleText, categoryFilter === t && styles.activeToggleText]}>{t.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15, zIndex: 10 }}>
                        <TouchableOpacity style={[styles.dropdownTrigger, { flex: 1, backgroundColor: theme.card }]} onPress={handleDateTrigger}>
                            <Text style={{color: theme.text, fontWeight: '700'}}>{selectedDate ? selectedDate.toLocaleDateString() : "All Dates"}</Text>
                            <Ionicons name="calendar" size={18} color={theme.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.dropdownTrigger, { flex: 1, backgroundColor: theme.card }]} onPress={() => setActivityPickerVisible(true)}>
                            <Text style={{color: theme.text, fontWeight: '700'}} numberOfLines={1}>{selectedActivity}</Text>
                            <Ionicons name="filter" size={18} color={theme.accent} />
                        </TouchableOpacity>
                    </View>

                    {selectedDate && (
                        <TouchableOpacity style={styles.clearBanner} onPress={() => setSelectedDate(null)}>
                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Showing {selectedDate.toLocaleDateString()} • Clear Filter ×</Text>
                        </TouchableOpacity>
                    )}

                    <FlatList
                        data={filteredWorkouts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderWorkoutItem}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                </View>

                {/* MODALS */}
                <Modal visible={activityPickerVisible} transparent animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => setActivityPickerVisible(false)}>
                        <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
                            <ScrollView>{uniqueActivities.map(act => (
                                <TouchableOpacity key={act} style={styles.modalItem} onPress={() => { setSelectedActivity(act); setActivityPickerVisible(false); }}>
                                    <Text style={{ color: theme.text, fontSize: 16 }}>{act}</Text>
                                </TouchableOpacity>
                            ))}</ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                <Modal visible={editModalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.editSheet, { backgroundColor: theme.card }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Entry</Text>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* DATE EDIT SECTION */}
<Text style={styles.statLabel}>Workout Date</Text>
<View style={{ marginBottom: 20 }}>
    {Platform.OS === 'web' ? (
        <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            style={{
                backgroundColor: theme.inputBg,
                color: theme.text,
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '16px',
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit'
            }}
        />
    ) : (
<>
        <TouchableOpacity 
            style={[styles.input, { backgroundColor: theme.inputBg, flexDirection: 'row', justifyContent: 'space-between' }]} 
            onPress={() => setShowDatePicker(true)}
        >
            <Text style={{ color: theme.text }}>{editDate}</Text>
            <Ionicons name="calendar-outline" size={20} color={theme.accent} />
        </TouchableOpacity>
        {/* WE REMOVED THE DUPLICATE DATETIMEPICKER FROM HERE */}
    </>
    )}
</View>
                                {editingWorkout?.category === 'strength' ? (
                                    <View style={styles.editRow}>
                                        <View style={{flex:1}}><Text style={styles.statLabel}>Sets</Text><TextInput style={[styles.input, {backgroundColor: theme.inputBg, color: theme.text}]} value={editSets} onChangeText={setEditSets} keyboardType="numeric" /></View>
                                        <View style={{flex:1}}>
                                            <Text style={styles.statLabel}>Reps</Text>
                                            <TextInput style={[styles.input, {backgroundColor: theme.inputBg, color: theme.text}]} value={editReps} onChangeText={setEditReps} keyboardType="numeric" />
                                        </View>
{/* Inside the Edit Modal Strength Row */}
<View style={{flex:1}}>
<TouchableOpacity 
                onPress={() => setEditWeightUnit(editWeightUnit === 'kg' ? 'lbs' : 'kg')}
                style={{
                    backgroundColor: theme.accent + '20',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: theme.accent
                }}
            >
                <Text style={{ color: theme.accent, fontSize: 9, fontWeight: 'bold' }}>
                    {editWeightUnit.toUpperCase()}
                </Text>
            </TouchableOpacity>    
            <TextInput 
        style={[styles.input, {backgroundColor: theme.inputBg, color: theme.text}]} 
        value={editWeight} 
        onChangeText={setEditWeight} 
        keyboardType="numeric" 
    />
</View>                                   
</View>
                                ) : (
                                    <View style={styles.editRow}>
                                        <View style={{flex:1}}><Text style={styles.statLabel}>Min</Text><TextInput style={[styles.input, {backgroundColor: theme.inputBg, color: theme.text}]} value={editDuration} onChangeText={setEditDuration} keyboardType="numeric" /></View>
                                        <View style={{flex:1}}>
                                              {/* NEW LOGIC: Only show unit toggle if it is a DISTANCE workout */}
       {editingWorkout?.metricType === 'DISTANCE' ? (
<TouchableOpacity 
    onPress={() => {
        // 1. Identify if this is a performance (speed) workout based on 
        // the INITIAL unit it had when you opened the modal.
        const isSpeedWorkout = editingWorkout?.unit?.includes('/h');

        if (isSpeedWorkout) {
            // ONLY toggle between speed units
            setEditunit(editunit === 'km/h' ? 'mph' : 'km/h');
        } else {
            // ONLY toggle between distance units
            setEditunit(editunit === 'km' ? 'mi' : 'km');
        }
    }}
    style={{
        backgroundColor: theme.accent + '20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.accent,
        alignSelf: 'flex-start',
        marginBottom: 4
    }}
>
    <Text style={{ color: theme.accent, fontSize: 9, fontWeight: 'bold' }}>
        {editunit.toUpperCase()} ⇅
    </Text>
</TouchableOpacity>
       ) : (
           /* If it's Floors or Level, just show the label */
           <Text style={styles.statLabel}>{editingWorkout?.metricType || 'METRIC'}</Text>
       )}

       <TextInput 
           style={[styles.input, {backgroundColor: theme.inputBg, color: theme.text}]} 
           value={editDistance} 
           onChangeText={setEditDistance} 
           keyboardType="numeric" 
       />
                                            </View>
                                        </View>
                                    )}
                                                                            
                                <Text style={styles.statLabel}>Intensity (RPE 1-10)</Text>
                                <TextInput 
                                    style={[styles.input, { backgroundColor: editIntensity ? getRPEColor(Number(editIntensity)) + '15' : theme.inputBg, color: theme.text }]} 
                                    value={editIntensity} 
                                    onChangeText={setEditIntensity} 
                                    keyboardType="numeric" 
                                />

                                <Text style={styles.statLabel}>Notes</Text>
                                <TextInput 
                                    style={[styles.input, {backgroundColor: theme.inputBg, color: theme.text, height: 80, textAlignVertical: 'top'}]} 
                                    value={editNotes} 
                                    onChangeText={setEditNotes} 
                                    multiline 
                                />
                                
                                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
                                    <Text style={styles.saveBtnText}>Update Workout</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={{marginVertical: 15, alignItems: 'center'}} onPress={() => setEditModalVisible(false)}>
                                    <Text style={{color: theme.subtext}}>Cancel</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

{/* MOBILE DATE PICKER - UPDATED LOGIC */}
{Platform.OS !== 'web' && showDatePicker && (
    <DateTimePicker 
        value={
            // If editing, use editDate; otherwise use filter date or today
            editModalVisible 
                ? new Date(editDate || new Date()) 
                : (selectedDate || new Date())
        } 
        mode="date" 
        onChange={(e, d) => { 
            setShowDatePicker(false); 
            if (d) {
                if (editModalVisible) {
                    // Update the workout being edited
                    setEditDate(d.toISOString().split('T')[0]);
                } else {
                    // Update the page filter
                    setSelectedDate(d);
                }
            }
        }} 
    />
)}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 32, fontWeight: '900', marginBottom: 15 },
    toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 4, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeToggleLight: { backgroundColor: '#fff' },
    activeToggleDark: { backgroundColor: '#3a3a3c' },
    toggleText: { fontSize: 10, fontWeight: '800', color: '#8e8e93' },
    activeToggleText: { color: '#007AFF' },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12 },
    card: { padding: 20, borderRadius: 20, marginBottom: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    dateText: { fontSize: 12, color: '#8e8e93' },
    activityTitle: { fontSize: 18, fontWeight: '800' },
    statsRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
    statLabel: { fontSize: 9, color: '#8e8e93', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
    statValue: { fontSize: 18, fontWeight: '800' },
    performanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1 },
    performanceText: { fontSize: 12, fontWeight: '600' },
    rpeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 10 },
    rpeBadgeText: { fontSize: 10, fontWeight: '800' },
    notesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    notesBtnText: { fontSize: 12, fontWeight: '800', color: '#007AFF' },
    notesContent: { marginTop: 12, padding: 12, borderRadius: 12 },
    notesText: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
    clearBanner: { backgroundColor: '#007AFF', padding: 12, borderRadius: 12, marginBottom: 15, alignItems: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalSheet: { width: '80%', borderRadius: 20, padding: 20, maxHeight: '70%' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
    editSheet: { width: '100%', position: 'absolute', bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, height: '75%' },
    modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 20 },
    editRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    input: { padding: 15, borderRadius: 12, fontSize: 16, fontWeight: 'bold' },
    saveBtn: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 15 },
    saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});