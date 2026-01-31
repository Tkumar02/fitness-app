import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, useColorScheme, View
} from 'react-native';

export default function AddExerciseModal({ visible, onClose, onAdd, customList, user }: any) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Dynamic Theme
  const theme = {
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1C1C1E',
    subtext: isDark ? '#8E8E93' : '#636366',
    input: isDark ? '#2C2C2E' : '#F2F2F7',
    border: isDark ? '#38383A' : '#E5E5EA',
    accent: '#007AFF',
    segmentBg: isDark ? '#2C2C2E' : '#F2F2F7',
    activeSegment: isDark ? '#48484A' : '#FFFFFF',
  };

  // State
  const [category, setCategory] = useState<'strength' | 'cardio'>('strength');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedName, setSelectedName] = useState('');
  
  // Unit Toggles
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [distUnit, setDistUnit] = useState<'km' | 'miles'>('km');

  // Input Data
  const [duration, setDuration] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [focus, setFocus] = useState<'endurance' | 'performance'>('endurance');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [isBodyweight, setIsBodyweight] = useState(false);

  // Exercise List Filtering
  const listToDisplay = useMemo(() => {
    const defaults = {
      cardio: ['Running', 'Cycling', 'Treadmill', 'Rowing', 'Elliptical', 'Stairmaster'],
      strength: ['Bench Press', 'Squats', 'Deadlift', 'Shoulder Press', 'Pull Ups', 'Dips'],
    };
    const base = defaults[category].map(name => ({ name, isCustom: false }));
    const custom = customList
      .filter((c: any) => c.category === category)
      .map((c: any) => ({ name: c.name, isCustom: true }));
    
    const combined = [...base, ...custom];
    return searchQuery 
      ? combined.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : combined;
  }, [category, customList, searchQuery]);

  const handleCreateCustom = async () => {
    if (!searchQuery.trim() || !user?.uid) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'customEquipment'), {
        name: searchQuery.trim(),
        category: category,
        createdAt: serverTimestamp(),
      });
      setSelectedName(searchQuery.trim());
      setSearchQuery('');
      Alert.alert("Success", `"${searchQuery}" added to your library.`);
    } catch (e) {
      Alert.alert("Error", "Failed to save custom exercise.");
    }
  };

  const handleFinalAdd = () => {
    if (!selectedName) return Alert.alert('Error', 'Select an exercise first');

    const exerciseData = {
      id: Date.now().toString(),
      name: selectedName,
      category,
      ...(category === 'cardio' ? {
        duration,
        metricValue,
        focus,
        unit: distUnit,
      } : {
        sets,
        reps,
        weight: weight || '0',
        isBodyweight,
        unit: weightUnit,
      }),
    };

    onAdd(exerciseData);
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedName(''); setSearchQuery(''); setDuration(''); setMetricValue('');
    setSets(''); setReps(''); setWeight(''); setIsBodyweight(false); setFocus('endurance');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: theme.text }]}>Add Exercise</Text>

          {/* Main Category Toggle */}
          <View style={[styles.segmentedContainer, { backgroundColor: theme.segmentBg }]}>
            {(['strength', 'cardio'] as const).map((type) => (
              <TouchableOpacity 
                key={type}
                style={[styles.segment, category === type && [styles.activeSegment, { backgroundColor: theme.activeSegment }]]}
                onPress={() => { setCategory(type); setSelectedName(''); }}
              >
                <Text style={{ 
                  color: category === type ? theme.text : theme.subtext, 
                  fontWeight: '700', textTransform: 'uppercase', fontSize: 12 
                }}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search Bar */}
          <TextInput 
            style={[styles.searchInput, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
            placeholder="Search exercises..."
            placeholderTextColor={theme.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Chips for selection */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {searchQuery.length > 0 && !listToDisplay.find(e => e.name.toLowerCase() === searchQuery.toLowerCase()) && (
              <TouchableOpacity style={[styles.chip, { backgroundColor: theme.accent }]} onPress={handleCreateCustom}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Create "{searchQuery}"</Text>
              </TouchableOpacity>
            )}
            {listToDisplay.map((ex) => (
              <TouchableOpacity
                key={ex.name}
                onPress={() => setSelectedName(ex.name)}
                style={[styles.chip, { backgroundColor: selectedName === ex.name ? theme.accent : theme.input }]}
              >
                <Text style={{ color: selectedName === ex.name ? '#fff' : theme.text, fontWeight: '600' }}>{ex.name}</Text>
                {ex.isCustom && <Ionicons name="person" size={12} color={selectedName === ex.name ? '#fff' : theme.subtext} style={{marginLeft: 5}} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sub-Toggles (Endurance/Perf or Loaded/Bodyweight) */}
          <View style={[styles.subToggleContainer, { backgroundColor: theme.input }]}>
            {category === 'strength' ? (
              <>
                <TouchableOpacity style={[styles.subToggle, !isBodyweight && styles.activeSubToggle]} onPress={() => setIsBodyweight(false)}>
                  <Text style={[styles.subToggleText, { color: !isBodyweight ? '#000' : theme.subtext }]}>LOADED</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.subToggle, isBodyweight && styles.activeSubToggle]} onPress={() => setIsBodyweight(true)}>
                  <Text style={[styles.subToggleText, { color: isBodyweight ? '#000' : theme.subtext }]}>BODYWEIGHT</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.subToggle, focus === 'endurance' && styles.activeSubToggle]} onPress={() => setFocus('endurance')}>
                  <Text style={[styles.subToggleText, { color: focus === 'endurance' ? '#000' : theme.subtext }]}>ENDURANCE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.subToggle, focus === 'performance' && styles.activeSubToggle]} onPress={() => setFocus('performance')}>
                  <Text style={[styles.subToggleText, { color: focus === 'performance' ? '#000' : theme.subtext }]}>PERFORMANCE</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Inputs Grid */}
          <View style={styles.grid}>
            {category === 'strength' ? (
              <>
                <InputBox label="SETS" value={sets} onChange={setSets} theme={theme} />
                <InputBox label="REPS" value={reps} onChange={setReps} theme={theme} />
                <View style={styles.inputWrapper}>
                  <TouchableOpacity onPress={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}>
                    <Text style={[styles.tinyLabel, { color: theme.accent }]}>{isBodyweight ? '+ ' : ''}{weightUnit.toUpperCase()} ⇅</Text>
                  </TouchableOpacity>
                  <TextInput style={[styles.gridInput, { backgroundColor: theme.input, color: theme.text }]} placeholder="0" keyboardType="numeric" value={weight} onChangeText={setWeight} />
                </View>
              </>
            ) : (
              <>
                <InputBox label="MINS" value={duration} onChange={setDuration} theme={theme} />
                <View style={styles.inputWrapper}>
                  <TouchableOpacity onPress={() => setDistUnit(distUnit === 'km' ? 'miles' : 'km')}>
                    <Text style={[styles.tinyLabel, { color: theme.accent }]}>{focus === 'endurance' ? distUnit.toUpperCase() : 'LVL'} ⇅</Text>
                  </TouchableOpacity>
                  <TextInput style={[styles.gridInput, { backgroundColor: theme.input, color: theme.text }]} placeholder="0" keyboardType="numeric" value={metricValue} onChangeText={setMetricValue} />
                </View>
              </>
            )}
          </View>

          {/* Actions */}
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: theme.accent }]} onPress={handleFinalAdd}>
            <Text style={styles.mainBtnText}>Add Exercise</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={resetAndClose}>
            <Text style={{ color: theme.subtext, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const InputBox = ({ label, value, onChange, theme }: any) => (
  <View style={styles.inputWrapper}>
    <Text style={[styles.tinyLabel, { color: theme.subtext }]}>{label}</Text>
    <TextInput 
      style={[styles.gridInput, { backgroundColor: theme.input, color: theme.text }]} 
      placeholder="0" placeholderTextColor={theme.subtext} keyboardType="numeric" value={value} onChangeText={onChange} 
    />
  </View>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#888', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  segmentedContainer: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 15 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeSegment: { elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1 },
  searchInput: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 15, fontSize: 16 },
  chipScroll: { marginBottom: 20, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  subToggleContainer: { flexDirection: 'row', padding: 3, borderRadius: 10, marginBottom: 20 },
  subToggle: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 8 },
  activeSubToggle: { backgroundColor: '#FFFFFF' },
  subToggleText: { fontSize: 10, fontWeight: '900' },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  inputWrapper: { flex: 1 },
  tinyLabel: { fontSize: 10, fontWeight: '800', marginBottom: 5, textAlign: 'center' },
  gridInput: { borderRadius: 14, padding: 16, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  mainBtn: { padding: 18, borderRadius: 18, alignItems: 'center' },
  mainBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  cancelBtn: { marginTop: 15, alignItems: 'center', padding: 10 }
});