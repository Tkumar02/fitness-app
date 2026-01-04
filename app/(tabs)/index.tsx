//index page in tabs folder
import { auth } from '@/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function LandingPage() {
  const { user, setUser } = useContext(UserContext);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      router.replace('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <LinearGradient
      colors={['#3b82f6', '#06b6d4', '#10b981']}
      style={styles.gradient}
    >
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Welcome to ActiveMe</Text>
        <Text style={styles.subtitle}>Track your journey, smash your goals 💪</Text>

        <View style={styles.buttonContainer}>
          {!user ? (
            <>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('/(auth)/Login')}
              >
                <Text style={styles.buttonText}>Log In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => router.push('/(auth)/Signup')}
              >
                <Text style={styles.buttonText}>Sign Up</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('/homepage')}
              >
                <Text style={styles.buttonText}>Continue to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Text style={styles.buttonText}>Logout</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#e0f2fe',
    marginBottom: 50,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  logoutButton: {
    backgroundColor: 'rgba(239,68,68,0.8)',
    borderColor: 'rgba(239,68,68,0.9)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


// import { auth, db } from '@/firebase';
// import { useRouter } from 'expo-router';
// import { onAuthStateChanged } from 'firebase/auth';
// import { doc, getDoc } from 'firebase/firestore';
// import React, { useContext, useEffect, useState } from 'react';
// import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
// import { UserContext } from '../context/UserContext';

// export default function LandingPage() {
//   const router = useRouter();
//   const { user, setUser } = useContext(UserContext);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
//       if (firebaseUser) {
//         try {
//           // Check if profile exists in Firestore
//           const docRef = doc(db, 'users', firebaseUser.uid);
//           const docSnap = await getDoc(docRef);

//           if (docSnap.exists()) {
//             const userData = { uid: firebaseUser.uid, email: firebaseUser.email, ...docSnap.data() };
//             setUser(userData);
//             router.replace('/homepage'); // ✅ go to homepage
//           } else {
//             // If profile does not exist, send them to profile setup
//             router.replace('/(auth)/Profile');
//           }
//         } catch (err) {
//           console.error('Error checking user profile:', err);
//         }
//       }
//       setLoading(false);
//     });

//     return unsubscribe;
//   }, []);

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.center}>
//       <Text style={styles.title}>Welcome to Fitness App</Text>
//       <Button title="Login" onPress={() => router.push('/(auth)/Login')} />
//       <Button title="Sign Up" onPress={() => router.push('/(auth)/Signup')} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   title: { fontSize: 24, marginBottom: 20, fontWeight: 'bold' },
// });



// // app/(tabs)/index.tsx
// import { useRouter } from 'expo-router';
// import React, { useContext } from 'react';
// import { Button, StyleSheet, Text, View } from 'react-native';
// import LogoutButton from '../(auth)/Logout';
// import { UserContext } from '../context/UserContext';

// export default function LandingPage() {
//   const { user } = useContext(UserContext);
//   const router = useRouter();

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Welcome to the Landing Page!</Text>

//       {user ? (
//         <>
//           <Text style={styles.subtitle}>You are logged in.</Text>
//           <LogoutButton />
//         </>
//       ) : (
//         <>
//           <Text style={styles.subtitle}>Please log in or sign up.</Text>
//           <Button title="Login" onPress={() => router.push('/(auth)/Login')} />
//           <View style={{ height: 10 }} />
//           <Button title="Sign Up" onPress={() => router.push('/(auth)/Signup')} />
//         </>
//       )}

//       <View style={{ height: 20 }} />
//       {/* Always visible button to go to homepage */}
//       <Button
//         title="See Home Page"
//         onPress={() => router.push('/homepage')}
//         color="#10b981"
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
//   title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
//   subtitle: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
// });
