import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration object containing keys and identifiers for your app
const firebaseConfig = {
	apiKey: "AIzaSyCUIrhYlWJhZEeMAt9UwwWALcQDaPL6_wQ",
	authDomain: "envirolink-df389.firebaseapp.com",
	projectId: "envirolink-df389",
	storageBucket: "envirolink-df389.appspot.com",
	messagingSenderId: "358406913066",
	appId: "1:358406913066:web:823b03929103721994d753",
	measurementId: "G-CLC9KHC3V1",
	// apiKey: "AIzaSyCFb5qLDoz2hpWDnJ2Vf-ie1-3Fvt3F_Ds",
	// authDomain: "e-commerce-project-fe192.firebaseapp.com",
	// projectId: "e-commerce-project-fe192",
	// storageBucket: "e-commerce-project-fe192.appspot.com",
	// messagingSenderId: "197203638225",
	// appId: "1:197203638225:web:b7c00f3c987c91167c12f0",
};

// Initialize Firebase app with the provided configuration
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

// Get Auth instance from the initialized app
const auth = getAuth(app);

// Get Firestore instance from the initialized app
const db = getFirestore(app);

// Get Storage instance from the initialized app
const storage = getStorage(app);

// Export Firestore and Storage instances for use in other parts of the app
export { auth, db, storage };
