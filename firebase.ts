import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth'; // Added 'Auth' type
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Import the problematic function via require
const { getReactNativePersistence } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyDPoosMOlNfzhkieXVX2pKCAyYSE4e_KmE",
    authDomain: "activeme-lt3.firebaseapp.com",
    projectId: "activeme-lt3",
    storageBucket: "activeme-lt3.firebasestorage.app",
    messagingSenderId: "618736235893",
    appId: "1:618736235893:web:47fdd824adadd39e80cf3c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Explicitly type the auth variable so other files don't complain
let auth: Auth; 

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

const db = getFirestore(app);

export { auth, db };

