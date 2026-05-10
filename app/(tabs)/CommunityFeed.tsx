import { UserContext } from "@/context/UserContext";
import { db } from "@/firebase";
import { Ionicons } from "@expo/vector-icons";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import React, { useContext, useEffect, useState } from "react";
import {
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunityFeed() {
    const { user } = useContext(UserContext);
    const isDark = useColorScheme() === 'dark';
    
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [clientBios, setClientBios] = useState<Record<string, any>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);

    const theme = {
        bg: isDark ? '#000' : '#f2f2f7',
        card: isDark ? '#1C1C1E' : '#fff',
        text: isDark ? '#fff' : '#000',
        subtext: '#8e8e93',
        accent: '#007AFF',
        success: '#34C759'
    };

    useEffect(() => {
        if (!user?.uid) return;

        let q;
        if (user.role === 'trainer') {
            q = query(
                collection(db, "workoutSessions"),
                where("trainerId", "==", user.uid),
                where("status", "==", "completed"),
                orderBy("endedAt", "desc")
            );
        } else {
            q = query(
                collection(db, "workoutSessions"),
                where("userId", "==", user.uid),
                where("status", "==", "completed"),
                orderBy("endedAt", "desc")
            );
        }

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSessions(data);

            // Fetch bio data for clients if trainer
            if (user.role === 'trainer') {
                const uniqueUserIds = Array.from(new Set(data.map(s => s.userId)));
                const bios: Record<string, any> = {};
                for (const uid of uniqueUserIds) {
                    if (uid) {
                        const uDoc = await getDoc(doc(db, 'users', uid));
                        if (uDoc.exists()) {
                            const uData = uDoc.data();
                            if (uData.shareBio) {
                                bios[uid] = {
                                    weight: uData.weight,
                                    height: uData.height,
                                    dob: uData.dob,
                                    name: uData.name || uData.username
                                };
                            }
                        }
                    }
                }
                setClientBios(bios);
            }

            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error('Fetch error', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const renderItem = ({ item }: { item: any }) => {
        const isExpanded = expandedSession === item.id;
        const endedAt = item.endedAt?.toDate ? item.endedAt.toDate() : new Date(item.endedAt);
        const bio = clientBios[item.userId];

        return (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.regimeName, { color: theme.text }]}>{item.templateName || item.regimeName}</Text>
                        <Text style={styles.dateText}>
                            {user?.role === 'trainer' && bio ? `${bio.name} • ` : ''}
                            {endedAt.toLocaleDateString()} at {endedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <View style={styles.statsBadge}>
                        <Ionicons name="time-outline" size={14} color={theme.accent} />
                        <Text style={[styles.statsText, { color: theme.accent }]}>{formatDuration(item.totalDurationSec || 0)}</Text>
                    </View>
                </View>

                {user?.role === 'trainer' && bio && (
                    <View style={styles.bioRow}>
                        <View style={styles.bioItem}><Text style={styles.bioLabel}>WT</Text><Text style={[styles.bioValue, { color: theme.text }]}>{bio.weight}kg</Text></View>
                        <View style={styles.bioItem}><Text style={styles.bioLabel}>HT</Text><Text style={[styles.bioValue, { color: theme.text }]}>{bio.height}cm</Text></View>
                        <View style={styles.bioItem}><Text style={styles.bioLabel}>AGE</Text><Text style={[styles.bioValue, { color: theme.text }]}>{calculateAge(bio.dob)}</Text></View>
                    </View>
                )}

                {item.notes && (
                    <View style={[styles.sessionNote, { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0' }]}>
                        <Ionicons name="chatbubble-outline" size={16} color={theme.subtext} />
                        <Text style={[styles.noteText, { color: theme.text }]}>{item.notes}</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.expandBtn} 
                    onPress={() => setExpandedSession(isExpanded ? null : item.id)}
                >
                    <Text style={{ color: theme.accent, fontWeight: '700' }}>{isExpanded ? 'Hide Details' : 'View Exercises'}</Text>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.accent} />
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.exerciseList}>
                        {item.exercises?.map((ex: any, idx: number) => (
                            <View key={idx} style={styles.exerciseItem}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={[styles.exName, { color: theme.text }]}>{ex.activity}</Text>
                                    <Text style={styles.exStats}>
                                        {ex.category === 'strength' 
                                            ? `${ex.sets}x${ex.reps} • ${ex.weight}${ex.weightUnit || 'kg'}`
                                            : `${ex.duration}m • ${ex.distance}${ex.unit}`
                                        }
                                    </Text>
                                </View>
                                {ex.notes && (
                                    <Text style={[styles.exNote, { color: theme.subtext }]}>Note: {ex.notes}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={styles.container}>
                <Text style={[styles.header, { color: theme.text }]}>
                    {user?.role === 'trainer' ? 'Client Progress' : 'Recent Workouts'}
                </Text>
                
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 100 }}>
                            <Ionicons name="fitness-outline" size={60} color={theme.subtext} style={{ opacity: 0.3 }} />
                            <Text style={{ color: theme.subtext, marginTop: 20 }}>No completed workouts found.</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 32, fontWeight: '900', marginBottom: 20 },
    card: { padding: 20, borderRadius: 20, marginBottom: 15, elevation: 2, shadowOpacity: 0.05, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    regimeName: { fontSize: 18, fontWeight: '800' },
    dateText: { fontSize: 12, color: '#8e8e93', marginTop: 4 },
    statsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,122,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
    statsText: { fontSize: 13, fontWeight: '700' },
    bioRow: { flexDirection: 'row', gap: 20, marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    bioItem: { alignItems: 'center' },
    bioLabel: { fontSize: 9, color: '#8e8e93', fontWeight: 'bold' },
    bioValue: { fontSize: 14, fontWeight: '800' },
    sessionNote: { padding: 12, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 15 },
    noteText: { fontSize: 13, flex: 1, fontStyle: 'italic' },
    expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center', paddingVertical: 5 },
    exerciseList: { marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 15 },
    exerciseItem: { marginBottom: 12 },
    exName: { fontSize: 14, fontWeight: '700' },
    exStats: { fontSize: 12, color: '#8e8e93' },
    exNote: { fontSize: 11, fontStyle: 'italic', marginTop: 2 }
});
