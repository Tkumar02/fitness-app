import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AddWorkoutScreen() {
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [type, setType] = useState<'cardio' | 'strength' | 'stretch' | ''>('');
    const [subType, setSubType] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [time, setTime] = useState('');

    const workoutOptions: Record<string, string[]> = {
        strength: ['Arms', 'Legs', 'Back', 'Core', 'Upper Body', 'Lower Body', 'Shoulders', 'Neck'],
        cardio: ['Running', 'Rowing', 'Cycling', 'SkiERG'],
        stretch: ['Full Body', 'Yoga', 'Mobility', 'Custom'],
    };

    const handleSave = () => {
        const workoutData = {
            date: date.toISOString().split('T')[0],
            type,
            subType,
            ...(type === 'strength' && { sets, reps }),
            ...(type === 'cardio' && { time }),
        };
        console.log('Workout Saved:', workoutData);
        // 🔥 Here you’d save to Firestore
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add Workout</Text>

            {/* Date Picker */}
            <View style={styles.section}>
                <Text style={styles.label}>Date</Text>
                <Button title={date.toDateString()} onPress={() => setShowDatePicker(true)} />
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) setDate(selectedDate);
                        }}
                    />
                )}
            </View>

            {/* Workout Type Picker */}
            <View style={styles.section}>
                <Text style={styles.label}>Type of Workout</Text>
                <Picker selectedValue={type} onValueChange={(value) => { setType(value); setSubType(''); }}>
                    <Picker.Item label="-- Select --" value="" />
                    <Picker.Item label="Strength" value="strength" />
                    <Picker.Item label="Cardio" value="cardio" />
                    <Picker.Item label="Stretch" value="stretch" />
                </Picker>
            </View>

            {/* SubType Picker (Dynamic) */}
            {type && (
                <View style={styles.section}>
                    <Text style={styles.label}>
                        {type === 'strength' ? 'Area of Focus' : type === 'cardio' ? 'Activity' : 'Stretch Type'}
                    </Text>
                    <Picker selectedValue={subType} onValueChange={(value) => setSubType(value)}>
                        <Picker.Item label="-- Select --" value="" />
                        {workoutOptions[type].map((opt) => (
                            <Picker.Item key={opt} label={opt} value={opt} />
                        ))}
                    </Picker>
                </View>
            )}

            {/* Strength Inputs */}
            {type === 'strength' && (
                <View style={styles.section}>
                    <Text style={styles.label}>Sets</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={sets}
                        onChangeText={setSets}
                        placeholder="e.g. 4"
                    />
                    <Text style={styles.label}>Reps</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={reps}
                        onChangeText={setReps}
                        placeholder="e.g. 12"
                    />
                </View>
            )}

            {/* Cardio Inputs */}
            {type === 'cardio' && (
                <View style={styles.section}>
                    <Text style={styles.label}>Time (minutes)</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={time}
                        onChangeText={setTime}
                        placeholder="e.g. 30"
                    />
                </View>
            )}

            <Button title="Save Workout" onPress={handleSave} disabled={!type || !subType} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    section: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10 },
});
