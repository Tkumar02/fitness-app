import { auth, db } from '@/firebase';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    DimensionValue,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
// Note: Path assumes context is in the root directory, outside of 'app'
import { UserContext } from '../../context/UserContext';

export default function HomePage() {
    const { user, setUser } = useContext(UserContext);
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    // Theme values
    const theme = {
        text: isDark ? '#FFFFFF' : '#000000',
        subtext: isDark ? '#AAAAAA' : '#666666',
        cardBg: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.9)',
        track: isDark ? '#333333' : '#E0E0E0',
        accent: '#007AFF',
        success: '#34C759',
        warning: '#FF9500'
    };

    const [username, setUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [motivation, setMotivation] = useState({ message: 'Ready for a workout?', icon: '💪' });

    // Stats states
    const [strengthStats, setStrengthStats] = useState({ current: 0, target: 0 });
    const [cardioStats, setCardioStats] = useState({ current: 0, target: 0 });
    const [activityGoal, setActivityGoal] = useState({
        name: 'Activity',
        distCurrent: 0,
        distTarget: 0,
        timeCurrent: 0,
        timeTarget: 0
    });

    useEffect(() => {
        // If no user is logged in, stop loading and just show the "Welcome" state
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // 1. Fetch User Info
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                setUsername(userSnap.data()?.username || 'User');

                // 2. Fetch Weekly Targets (Frequency)
                const goalSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
                const goals = goalSnap.exists() ? goalSnap.data() : {};

                // 3. Fetch Workouts from last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const q = query(
                    collection(db, 'workouts'),
                    where('userId', '==', user.uid),
                    where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
                );
                
                const querySnapshot = await getDocs(q);
                const workouts = querySnapshot.docs.map(d => d.data());
                
                const today = new Date();
                const sevenDaysAgoDate = new Date();
                sevenDaysAgoDate.setDate(today.getDate() - 7);
                const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().split('T')[0];

                const recentWorkouts = workouts.filter(w => w.date >= sevenDaysAgoStr);

                // 4. Calculate Frequency
                const sCurr = recentWorkouts.filter(w => w.category === 'strength').length;
                const sTar = Number(goals.strengthTarget) || 0;
                const cCurr = recentWorkouts.filter(w => w.category === 'cardio').length;
                const cTar = Number(goals.cardioTarget) || 0;

                setStrengthStats({ current: sCurr, target: sTar });
                setCardioStats({ current: cCurr, target: cTar });

                // 5. Calculate Activity Progress
                const targetActivity = goals.activity || 'Run';
                const matchingWorkouts = workouts.filter(w => 
                    w.activity?.toLowerCase() === targetActivity.toLowerCase()
                );

                const distances = matchingWorkouts.map(w => Number(w.distance) || 0);
                const durations = matchingWorkouts.map(w => Number(w.duration) || 0);

                setActivityGoal({
                    name: targetActivity,
                    distCurrent: distances.length > 0 ? Math.max(...distances) : 0,
                    distTarget: Number(goals.distGoal) || 0,
                    timeCurrent: durations.length > 0 ? Math.max(...durations) : 0,
                    timeTarget: Number(goals.timeGoal) || 0
                });

                // 6. Motivation Logic
                if (sTar + cTar > 0) {
                    const total = sCurr + cCurr;
                    if (total >= (sTar + cTar)) setMotivation({ message: "Weekly goals smashed!", icon: '🔥' });
                    else if (total > 0) setMotivation({ message: `You're ${total} workouts in. Keep it up!`, icon: '⚡' });
                }

            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            if (setUser) setUser(null);
            router.replace('/homepage'); 
        } catch (error) {
            Alert.alert("Error", "Could not sign you out.");
        }
    };

    const getWidth = (current: number, target: number): DimensionValue => {
        if (!target || target === 0) return '0%';
        return `${Math.min((current / target) * 100, 100)}%` as DimensionValue;
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
    }

    return (
        <ImageBackground source={require('../../assets/images/bg-weights.png')} style={styles.background}>
            <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.7)' }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    {/* Logged Out View: Show Welcome & Login Button */}
                    {!user ? (
                        <View style={styles.loggedOutContainer}>
                            <Text style={[styles.user, { color: theme.text, textAlign: 'center' }]}>ActiveMe</Text>
                            <Text style={[styles.welcome, { color: theme.subtext, textAlign: 'center', marginTop: 10 }]}>
                                Track your gains and crush your goals.
                            </Text>
                            <TouchableOpacity 
                                style={[styles.card, { backgroundColor: theme.accent, marginTop: 40, justifyContent: 'center' }]} 
                                onPress={() => router.push('/(auth)/Login')}
                            >
                                <Text style={styles.cardTitle}>Get Started</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Logged In View: Show Dashboard */
                        <View>
                            <View style={styles.header}>
                                <View style={styles.titleRow}>
                                    <View>
                                        <Text style={[styles.welcome, { color: theme.subtext }]}>Welcome back,</Text>
                                        <Text style={[styles.user, { color: theme.text }]}>{username} 👋</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={[styles.settingsIcon, {backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]} 
                                        onPress={() => router.push('/(auth)/Profile')}
                                    >
                                        <Text style={{fontSize: 24}}>⚙️</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.motivationCard, { backgroundColor: theme.cardBg }]}>
                                    <Text style={styles.motivationEmoji}>{motivation.icon}</Text>
                                    <Text style={[styles.motivationText, { color: theme.text }]}>{motivation.message}</Text>
                                </View>
                                
                                <View style={styles.statsContainer}>
                                    <ProgressBar label="Lifting Weekly" current={strengthStats.current} target={strengthStats.target} color={theme.accent} theme={theme} />
                                    <ProgressBar label="Cardio Weekly" current={cardioStats.current} target={cardioStats.target} color={theme.success} theme={theme} />
                                    {activityGoal.distTarget > 0 && (
                                        <ProgressBar label={`${activityGoal.name} Max Dist`} current={activityGoal.distCurrent} target={activityGoal.distTarget} color={theme.success} theme={theme} suffix="km" />
                                    )}
                                </View>
                            </View>

                            <View style={styles.menu}>
                                <MenuButton title="Log Workout" emoji="🏋️" color={theme.accent} onPress={() => router.push('/(tabs)/AddWorkout')} />
                                <MenuButton title="Progression" emoji="📊" color="#5856D6" onPress={() => router.push('/(tabs)/ReviewWorkout')} />
                                <MenuButton title="My Goals" emoji="🎯" color={theme.success} onPress={() => router.push('/(tabs)/Goals')} />
                            </View>

                            <TouchableOpacity onPress={handleSignOut} style={styles.logout}>
                                <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 16 }}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

// Sub-components for cleaner code
const ProgressBar = ({ label, current, target, color, theme, suffix = "" }: any) => {
    if (target <= 0) return null;
    const width = `${Math.min((current / target) * 100, 100)}%` as DimensionValue;
    return (
        <View style={styles.progressSection}>
            <View style={styles.labelRow}>
                <Text style={[styles.barLabel, {color: theme.text}]}>{label}</Text>
                <Text style={[styles.barValue, {color: current >= target ? theme.warning : theme.subtext}]}>
                    {current}/{target}{suffix} {current >= target ? '🔥' : ''}
                </Text>
            </View>
            <View style={[styles.barTrack, {backgroundColor: theme.track}]}>
                <View style={[styles.barFill, {width, backgroundColor: color}]} />
            </View>
        </View>
    );
};

const MenuButton = ({ title, emoji, color, onPress }: any) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: color }]} onPress={onPress}>
        <View style={styles.cardIconBox}><Text style={styles.cardEmoji}>{emoji}</Text></View>
        <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { flex: 1, paddingHorizontal: 25 },
    scrollContent: { paddingTop: 80, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    loggedOutContainer: { marginTop: 100, alignItems: 'center' },
    header: { marginBottom: 30 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    welcome: { fontSize: 16, fontWeight: '600' },
    user: { fontSize: 32, fontWeight: '900' },
    settingsIcon: { padding: 10, borderRadius: 14 },
    motivationCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 25, elevation: 4 },
    motivationEmoji: { fontSize: 26, marginRight: 15 },
    motivationText: { fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 20 },
    statsContainer: { width: '100%', gap: 20 },
    progressSection: { width: '100%' },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    barLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    barValue: { fontSize: 13, fontWeight: '900' },
    barTrack: { height: 10, width: '100%', borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },
    menu: { width: '100%', marginTop: 10 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 22, marginBottom: 15, elevation: 5 },
    cardIconBox: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardEmoji: { fontSize: 22 },
    cardTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
    logout: { marginTop: 30, alignSelf: 'center', padding: 10 }
});


// //index file in homepage folder

// import { auth, db } from '@/firebase';
// import { useRouter } from 'expo-router';
// import { signOut } from 'firebase/auth';
// import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
// import React, { useContext, useEffect, useState } from 'react';
// import {
//     ActivityIndicator,
//     Alert,
//     DimensionValue,
//     ImageBackground,
//     ScrollView,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     useColorScheme,
//     View
// } from 'react-native';
// import { UserContext } from '../../context/UserContext';

// export default function HomePage() {
//     const { user, setUser } = useContext(UserContext);
//     const router = useRouter();
//     const isDark = useColorScheme() === 'dark';

//     // Theme values
//     const theme = {
//         text: isDark ? '#FFFFFF' : '#000000',
//         subtext: isDark ? '#AAAAAA' : '#666666',
//         cardBg: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.9)',
//         track: isDark ? '#333333' : '#E0E0E0',
//         accent: '#007AFF',
//         success: '#34C759',
//         warning: '#FF9500'
//     };

//     const [username, setUsername] = useState<string | null>(null);
//     const [loading, setLoading] = useState(true);
//     const [motivation, setMotivation] = useState({ message: 'Ready for a workout?', icon: '💪' });

//     // Stats states
//     const [strengthStats, setStrengthStats] = useState({ current: 0, target: 0 });
//     const [cardioStats, setCardioStats] = useState({ current: 0, target: 0 });
//     const [activityGoal, setActivityGoal] = useState({
//         name: 'Activity',
//         distCurrent: 0,
//         distTarget: 0,
//         timeCurrent: 0,
//         timeTarget: 0
//     });

//     useEffect(() => {
//         if (!user) {
//             setLoading(false);
//             return;
//         }

//         const fetchData = async () => {
//             try {
//                 // 1. Fetch User Info
//                 const userSnap = await getDoc(doc(db, 'users', user.uid));
//                 setUsername(userSnap.data()?.username || 'User');

//                 // 2. Fetch Goals
//                 const goalSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'));
//                 const goals = goalSnap.exists() ? goalSnap.data() : {};

//                 // 3. Fetch Workouts from last 30 days
//                 const thirtyDaysAgo = new Date();
//                 thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//                 const q = query(
//                     collection(db, 'workouts'),
//                     where('userId', '==', user.uid),
//                     where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
//                 );
                
//                 const querySnapshot = await getDocs(q);
//                 const workouts = querySnapshot.docs.map(d => d.data());
                
//                 const today = new Date();
//                 const sevenDaysAgoDate = new Date();
//                 sevenDaysAgoDate.setDate(today.getDate() - 7);
//                 const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().split('T')[0];

//                 const recentWorkouts = workouts.filter(w => w.date >= sevenDaysAgoStr);

//                 // 4. Calculate Frequency
//                 const sCurr = recentWorkouts.filter(w => w.category === 'strength').length;
//                 const sTar = Number(goals.strengthTarget) || 0;
//                 const cCurr = recentWorkouts.filter(w => w.category === 'cardio').length;
//                 const cTar = Number(goals.cardioTarget) || 0;

//                 setStrengthStats({ current: sCurr, target: sTar });
//                 setCardioStats({ current: cCurr, target: cTar });

//                 // 5. Calculate Activity Specifics
//                 const targetActivity = goals.activity || 'Run';
//                 const matchingWorkouts = workouts.filter(w => 
//                     w.activity?.toLowerCase() === targetActivity.toLowerCase()
//                 );

//                 const distances = matchingWorkouts.map(w => Number(w.distance) || 0);
//                 const durations = matchingWorkouts.map(w => Number(w.duration) || 0);

//                 const dCurr = distances.length > 0 ? Math.max(...distances) : 0;
//                 const dTar = Number(goals.distGoal) || 0;
//                 const tCurr = durations.length > 0 ? Math.max(...durations) : 0;
//                 const tTar = Number(goals.timeGoal) || 0;

//                 setActivityGoal({
//                     name: targetActivity,
//                     distCurrent: dCurr,
//                     distTarget: dTar,
//                     timeCurrent: tCurr,
//                     timeTarget: tTar
//                 });

//                 // 6. Set Motivation Message
//                 const totalTarget = sTar + cTar;
//                 const totalCurrent = sCurr + cCurr;

//                 if (totalTarget > 0) {
//                     if (totalCurrent >= totalTarget) {
//                         setMotivation({ message: "Weekly goals smashed! You're on fire!", icon: '🔥' });
//                     } else if (totalCurrent > 0) {
//                         setMotivation({ message: `You're ${totalCurrent}/${totalTarget} through your week. Keep going!`, icon: '⚡' });
//                     } else {
//                         setMotivation({ message: "New week, new gains. Let's get started!", icon: '👟' });
//                     }
//                 }

//             } catch (err) {
//                 console.error("Fetch error:", err);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchData();
//     }, [user]);

//     const handleSignOut = async () => {
//         try {
//             await signOut(auth);
//             if (setUser) setUser(null);
//             router.replace('/'); 
//         } catch (error) {
//             Alert.alert("Error", "Could not sign you out.");
//         }
//     };

//     const getWidth = (current: number, target: number): DimensionValue => {
//         if (!target || target === 0) return '0%';
//         return `${Math.min((current / target) * 100, 100)}%` as DimensionValue;
//     };

//     const isGoalMet = (current: number, target: number) => target > 0 && current >= target;

//     if (loading) {
//         return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
//     }

//     return (
//         <ImageBackground source={require('../../assets/images/bg-weights.png')} style={styles.background}>
//             <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.7)' }]}>
//                 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
//                     <View style={styles.header}>
//                         <View style={styles.titleRow}>
//                             <View>
//                                 <Text style={[styles.welcome, { color: theme.subtext }]}>Welcome back,</Text>
//                                 <Text style={[styles.user, { color: theme.text }]}>{username} 👋</Text>
//                             </View>
//                             <TouchableOpacity style={[styles.settingsIcon, {backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}]} onPress={() => router.push('/Profile')}>
//                                 <Text style={{fontSize: 24}}>⚙️</Text>
//                             </TouchableOpacity>
//                         </View>

//                         {/* MOTIVATION CARD */}
//                         <View style={[styles.motivationCard, { backgroundColor: theme.cardBg }]}>
//                             <Text style={styles.motivationEmoji}>{motivation.icon}</Text>
//                             <Text style={[styles.motivationText, { color: theme.text }]}>{motivation.message}</Text>
//                         </View>
                        
//                         <View style={styles.statsContainer}>
//                             {/* Strength Bar */}
//                             {strengthStats.target > 0 && (
//                                 <View style={styles.progressSection}>
//                                     <View style={styles.labelRow}>
//                                         <Text style={[styles.barLabel, {color: theme.text}]}>Lifting Weekly</Text>
//                                         <Text style={[styles.barValue, {color: isGoalMet(strengthStats.current, strengthStats.target) ? theme.warning : theme.subtext}]}>
//                                             {strengthStats.current}/{strengthStats.target} {isGoalMet(strengthStats.current, strengthStats.target) ? '🔥' : ''}
//                                         </Text>
//                                     </View>
//                                     <View style={[styles.barTrack, {backgroundColor: theme.track}]}>
//                                         <View style={[styles.barFill, {width: getWidth(strengthStats.current, strengthStats.target), backgroundColor: theme.accent}]} />
//                                     </View>
//                                 </View>
//                             )}

//                             {/* Cardio Freq Bar */}
//                             {cardioStats.target > 0 && (
//                                 <View style={styles.progressSection}>
//                                     <View style={styles.labelRow}>
//                                         <Text style={[styles.barLabel, {color: theme.text}]}>Cardio Weekly</Text>
//                                         <Text style={[styles.barValue, {color: isGoalMet(cardioStats.current, cardioStats.target) ? theme.success : theme.subtext}]}>
//                                             {cardioStats.current}/{cardioStats.target} {isGoalMet(cardioStats.current, cardioStats.target) ? '🔥' : ''}
//                                         </Text>
//                                     </View>
//                                     <View style={[styles.barTrack, {backgroundColor: theme.track}]}>
//                                         <View style={[styles.barFill, {width: getWidth(cardioStats.current, cardioStats.target), backgroundColor: theme.success}]} />
//                                     </View>
//                                 </View>
//                             )}

//                             {/* Distance Goal Bar */}
//                             {activityGoal.distTarget > 0 && (
//                                 <View style={styles.progressSection}>
//                                     <View style={styles.labelRow}>
//                                         <Text style={[styles.barLabel, {color: theme.text}]}>{activityGoal.name} Max Dist</Text>
//                                         <Text style={[styles.barValue, {color: isGoalMet(activityGoal.distCurrent, activityGoal.distTarget) ? theme.success : theme.subtext}]}>
//                                             {activityGoal.distCurrent}/{activityGoal.distTarget}km {isGoalMet(activityGoal.distCurrent, activityGoal.distTarget) ? '🔥' : ''}
//                                         </Text>
//                                     </View>
//                                     <View style={[styles.barTrack, {backgroundColor: theme.track}]}>
//                                         <View style={[styles.barFill, {width: getWidth(activityGoal.distCurrent, activityGoal.distTarget), backgroundColor: theme.success}]} />
//                                     </View>
//                                 </View>
//                             )}
//                         </View>
//                     </View>

//                     <View style={styles.menu}>
//                         <TouchableOpacity style={[styles.card, { backgroundColor: theme.accent }]} onPress={() => router.push('/AddWorkout')}>
//                             <View style={styles.cardIconBox}><Text style={styles.cardEmoji}>🏋️</Text></View>
//                             <Text style={styles.cardTitle}>Log Workout</Text>
//                         </TouchableOpacity>

//                         <TouchableOpacity style={[styles.card, { backgroundColor: '#5856D6' }]} onPress={() => router.push('/ReviewWorkout')}>
//                             <View style={styles.cardIconBox}><Text style={styles.cardEmoji}>📊</Text></View>
//                             <Text style={styles.cardTitle}>Progression</Text>
//                         </TouchableOpacity>

//                         <TouchableOpacity style={[styles.card, { backgroundColor: theme.success }]} onPress={() => router.push('/Goals')}>
//                             <View style={styles.cardIconBox}><Text style={styles.cardEmoji}>🎯</Text></View>
//                             <Text style={styles.cardTitle}>My Goals</Text>
//                         </TouchableOpacity>
//                     </View>

//                     <TouchableOpacity onPress={handleSignOut} style={styles.logout}>
//                         <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 16 }}>Sign Out</Text>
//                     </TouchableOpacity>
//                 </ScrollView>
//             </View>
//         </ImageBackground>
//     );
// }

// const styles = StyleSheet.create({
//     background: { flex: 1 },
//     overlay: { flex: 1, paddingHorizontal: 25 },
//     scrollContent: { paddingTop: 60, paddingBottom: 40 },
//     center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
//     header: { marginBottom: 30 },
//     titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
//     welcome: { fontSize: 16, fontWeight: '600' },
//     user: { fontSize: 32, fontWeight: '900' },
//     settingsIcon: { padding: 10, borderRadius: 14 },
//     motivationCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
//     motivationEmoji: { fontSize: 26, marginRight: 15 },
//     motivationText: { fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 20 },
//     statsContainer: { width: '100%', gap: 20 },
//     progressSection: { width: '100%' },
//     labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
//     barLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
//     barValue: { fontSize: 13, fontWeight: '900' },
//     barTrack: { height: 12, width: '100%', borderRadius: 6, overflow: 'hidden' },
//     barFill: { height: '100%', borderRadius: 6 },
//     menu: { width: '100%' },
//     card: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 22, marginBottom: 15, elevation: 5 },
//     cardIconBox: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
//     cardEmoji: { fontSize: 22 },
//     cardTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
//     logout: { marginTop: 30, alignSelf: 'center', padding: 10 }
// });