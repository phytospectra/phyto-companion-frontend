import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when the mock backend is enabled — Firebase is then bypassed. */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

/** Firebase Auth instance (initialised lazily so mock mode never requires keys). */
export const auth: Auth = getAuth(getFirebaseApp());

/** Google sign-in provider. */
export const googleProvider = new GoogleAuthProvider();
