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
export async function ensureAuthenticated(): Promise<User | null> {
  if (currentUser) return currentUser;
  if (authInitPromise) return authInitPromise;

  authInitPromise = new Promise((resolve) => {
    try {
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
              console.warn('Firebase Auth anônimo não disponível, utilizando acesso direto Firestore:', err);
              unsubscribe();
              resolve(null as unknown as User);
            }
          }
        },
        (error) => {
          console.warn('Auth state error, continuando sem autenticação:', error);
          unsubscribe();
          resolve(null as unknown as User);
        }
      );
    } catch (e) {
      console.warn('Falha ao inicializar Auth, prosseguindo com Firestore:', e);
      resolve(null as unknown as User);
    }
  });

  return authInitPromise;
}
