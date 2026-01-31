import { UserContext } from '@/context/UserContext';
import { db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp, where
} from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  FlatList, Platform, StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TemplateList() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const [templates, setTemplates] = useState<any[]>([]);

  const theme = {
    bg: isDark ? '#000' : '#f2f2f7',
    card: isDark ? '#111' : '#fff',
    text: isDark ? '#fff' : '#000',
    sub: '#8e8e93',
    accent: '#34C759'
  };

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'templates'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, snap => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

//   useEffect(() => {
//   console.log("Debug: Starting simple fetch...");

//   // 1. Naked Query (No 'where', no 'orderBy')
//   const q = query(collection(db, 'templates'));

//   const unsubscribe = onSnapshot(q, (snap) => {
//     console.log("Debug: Snapshot triggered!");
//     console.log("Debug: Number of docs found:", snap.size);

//     if (snap.empty) {
//       console.log("Debug: Collection is totally empty in Firebase.");
//     }

//     const data = snap.docs.map(d => {
//       console.log("Debug: Found Doc ID:", d.id, "Data:", d.data());
//       return { id: d.id, ...d.data() };
//     });

//     setTemplates(data);
    
//     // This will pop up on your phone to tell you the count
//     if (snap.size > 0) {
//       Alert.alert("Debug", `Found ${snap.size} templates in Firebase!`);
//     }
//   }, (err) => {
//     console.error("Debug: Firebase Error:", err.message);
//     Alert.alert("Firebase Error", err.message);
//   });

//   return () => unsubscribe();
// }, []);

  // ================================
  // START REGIME
  // ================================
  const startRegime = async (template: any) => {
    const sessionRef = await addDoc(collection(db, 'workoutSessions'), {
      userId: user!.uid,
      templateId: template.id,
      templateName: template.name,
      status: 'active',
      startedAt: serverTimestamp(),
      endedAt: null,
      totalDurationSec: 0
    });

    navigation.navigate('ActiveRegime', {
      sessionId: sessionRef.id,
      template
    });
  };

// ================================
  // DELETE (Fixed path to match your fetch query)
  // ================================
  const deleteTemplate = async (id: string) => {
    const doDelete = async () => {
      try {
        // Updated path to top-level collection to match your onSnapshot query
        await deleteDoc(doc(db, 'templates', id));
      } catch (err) {
        console.error("Delete failed: ", err);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete template?')) doDelete();
    } else {
      Alert.alert('Delete Regime', 'Are you sure?', [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete }
      ]);
    }
  };

const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
        <Text style={{ color: theme.sub, fontSize: 12 }}>
          {item.exercises?.length || 0} exercises
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => startRegime(item)} style={styles.playBtn}>
          <Ionicons name="play" size={20} color="#000" />
        </TouchableOpacity>

        {/* ✅ FIXED: Use the screen name 'CreateRegime', not the file path */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('CreateRegime', { template: item })
          }
        >
          <Ionicons name="create-outline" size={20} color={theme.sub} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => deleteTemplate(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#ff453a" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlatList
        data={templates}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.header, { color: theme.text }]}>Regimes</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('CreateRegime')}
            >
              <Text style={{ fontWeight: '900' }}>+ New Regime</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: theme.sub, marginTop: 50 }}>
            No regimes yet. Create one 👇
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10
  },
  addBtn: {
    backgroundColor: '#a7ff83',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10
  },
  card: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '800'
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center'
  },
  playBtn: {
    backgroundColor: '#a7ff83',
    padding: 10,
    borderRadius: 12
  }
});
