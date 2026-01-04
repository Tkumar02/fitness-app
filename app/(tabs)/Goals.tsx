import { db } from '@/firebase';
import { Picker } from '@react-native-picker/picker';
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
    useColorScheme,
    View
} from 'react-native';
import { UserContext } from '../context/UserContext';

export default function GoalsPage() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    // Frequency States
    const [strengthTarget, setStrengthTarget] = useState('0');
    const [cardioTarget, setCardioTarget] = useState('0');
    
    // Activity & Metric States
    const [activity, setActivity] = useState('Run');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newActivityName, setNewActivityName] = useState('');
    
    // Now saving both independently
    const [distGoal, setDistGoal] = useState('0');
    const [timeGoal, setTimeGoal] = useState('0');

    useEffect(() => {
        const loadGoals = async () => {
            if (!user?.uid) return;
            try {
                const docSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setStrengthTarget(data.strengthTarget?.toString() || '0');
                    setCardioTarget(data.cardioTarget?.toString() || '0');
                    
                    const savedActivity = data.activity || 'Run';
                    const isPrefilled = ['Run', 'Walk', 'Row'].includes(savedActivity);
                    
                    if (isPrefilled) {
                        setActivity(savedActivity);
                        setIsAddingNew(false);
                    } else {
                        setActivity('NEW');
                        setIsAddingNew(true);
                        setNewActivityName(savedActivity);
                    }
                    
                    // Load both metrics
                    setDistGoal(data.distGoal?.toString() || '0');
                    setTimeGoal(data.timeGoal?.toString() || '0');
                }
            } catch (e) { console.error(e); }
        };
        loadGoals();
    }, [user]);

    const handleSave = async () => {
        if (!user?.uid) return;
        const finalActivity = activity === 'NEW' ? newActivityName : activity;
        
        if (activity === 'NEW' && !newActivityName.trim()) {
            Alert.alert("Error", "Please name your custom activity.");
            return;
        }

        try {
            await setDoc(doc(db, 'users', user.uid, 'settings', 'goals'), {
                strengthTarget: Number(strengthTarget) || 0,
                cardioTarget: Number(cardioTarget) || 0,
                activity: finalActivity,
                distGoal: Number(distGoal) || 0,
                timeGoal: Number(timeGoal) || 0,
                updatedAt: new Date()
            });
            Alert.alert("Success", "All goals saved!");
        } catch (e) { Alert.alert("Error", "Save failed"); }
    };

    const inputBg = isDark ? '#2c2c2e' : '#f2f2f7';
    const textColor = isDark ? '#fff' : '#000';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, { backgroundColor: isDark ? '#121212' : '#f9fafb' }]}>
                <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
                    <Text style={[styles.title, { color: textColor }]}>Performance Goals</Text>
                    
                    {/* FREQUENCY SECTION */}
                    <Text style={styles.sectionLabel}>Weekly Frequency</Text>
                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Strength</Text>
                            <TextInput 
                                style={[styles.input, { color: textColor, backgroundColor: inputBg }]}
                                keyboardType="numeric" value={strengthTarget} onChangeText={setStrengthTarget}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Cardio</Text>
                            <TextInput 
                                style={[styles.input, { color: textColor, backgroundColor: inputBg }]}
                                keyboardType="numeric" value={cardioTarget} onChangeText={setCardioTarget}
                            />
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* ACTIVITY SELECTION */}
                    <Text style={styles.sectionLabel}>Activity Goal</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: inputBg }]}>
                        <Picker
                            selectedValue={activity}
                            onValueChange={(val) => { setActivity(val); setIsAddingNew(val === 'NEW'); }}
                            style={{ color: textColor }}
                            dropdownIconColor={textColor}
                        >
                            <Picker.Item label="🏃 Running" value="Run" />
                            <Picker.Item label="🚶 Walking" value="Walk" />
                            <Picker.Item label="🚣 Rowing" value="Row" />
                            <Picker.Item label="➕ Add Activity..." value="NEW" />
                        </Picker>
                    </View>

                    {isAddingNew && (
                        <TextInput 
                            style={[styles.input, styles.spacing, { color: textColor, backgroundColor: inputBg, borderColor: '#007AFF', borderWidth: 1 }]}
                            placeholder="Activity Name (e.g. Swimming)"
                            placeholderTextColor="#8e8e93"
                            value={newActivityName}
                            onChangeText={setNewActivityName}
                        />
                    )}

                    {/* DUAL METRIC INPUTS */}
                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Distance (km)</Text>
                            <TextInput 
                                style={[styles.input, { color: textColor, backgroundColor: inputBg }]}
                                keyboardType="decimal-pad"
                                placeholder="0"
                                value={distGoal}
                                onChangeText={setDistGoal}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Time (mins)</Text>
                            <TextInput 
                                style={[styles.input, { color: textColor, backgroundColor: inputBg }]}
                                keyboardType="numeric"
                                placeholder="0"
                                value={timeGoal}
                                onChangeText={setTimeGoal}
                            />
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
    card: { padding: 25, borderRadius: 28, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
    title: { fontSize: 24, fontWeight: '900', marginBottom: 25, textAlign: 'center' },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: '#007AFF', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    inputGroup: { flex: 0.47 },
    pickerWrapper: { borderRadius: 15, marginBottom: 15, height: 55, justifyContent: 'center', overflow: 'hidden' },
    label: { fontSize: 11, fontWeight: '700', color: '#8e8e93', marginBottom: 8, textTransform: 'uppercase' },
    input: { padding: 15, borderRadius: 15, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    spacing: { marginBottom: 20 },
    divider: { height: 1, backgroundColor: 'rgba(142, 142, 147, 0.2)', marginVertical: 20 },
    btn: { backgroundColor: '#34C759', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});