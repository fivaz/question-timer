import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill in your Firebase web config.`,
    )
  }
  return value
}

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

function getApp(): FirebaseApp {
  if (!app) {
    app = initializeApp({
      apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
      authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
      storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: requireEnv('VITE_FIREBASE_APP_ID'),
    })
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getApp())
  return authInstance
}

export function getFirestoreDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getApp())
  return dbInstance
}
