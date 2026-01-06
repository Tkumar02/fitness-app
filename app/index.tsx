import { Redirect } from 'expo-router';
import React, { useContext } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { UserContext } from '../context/UserContext'; // Path might be './context/UserContext' if you didn't move it

export default function Index() {
    const { user, loading } = useContext(UserContext);

    // 1. Show a loader while UserContext determines if we have a user
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    // 2. Perform the redirect based on the TRUE auth state
    if (user) {
        return <Redirect href="/(tabs)" />;
    } else {
        // If no user, send them to the homepage or login
        return <Redirect href="/homepage" />;
    }
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#fff' // Or use your theme color
    },
});


// //index file in app folder
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useRouter } from 'expo-router';
// import React, { useEffect } from 'react';
// import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// export default function LandingScreen() {
//     const router = useRouter();

//     useEffect(() => {
//         const checkLoggedIn = async () => {
//             const uid = await AsyncStorage.getItem('userUid');

//             if (uid) {
//                 // User is logged in → go to Home
//                 router.replace('/(tabs)');
//             } else {
//                 // Not logged in → go to Login
//                 router.replace('/(auth)/Login');
//             }
//         };

//         checkLoggedIn();
//     }, []);

//     return (
//         <View style={styles.container}>
//             <Text style={styles.text}>Checking login status…</Text>
//             <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//     text: { fontSize: 18, fontWeight: '500' },
// });
