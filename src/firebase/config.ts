import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use custom firestoreDatabaseId if provisioned
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

let currentUser: User | null = null;
let authInitPromise: Promise<User> | null = null;

/**
 * Ensures anonymous authentication is active for Firestore access rules
 */
export async function ensureAuthenticated(): Promise<User> {
  if (currentUser) return currentUser;
  if (authInitPromise) return authInitPromise;

  authInitPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          currentUser = user;
          unsubscribe();
          resolve(user);
        } else {
          try {
            const userCred = await signInAnonymously(auth);
            currentUser = userCred.user;
            unsubscribe();
            resolve(userCred.user);
          } catch (err) {
            console.warn('Anonymous auth error, continuing with fallback:', err);
            unsubscribe();
            reject(err);
          }
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });

  return authInitPromise;
}
