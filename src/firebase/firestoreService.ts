import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db, ensureAuthenticated } from './config';
import { PontoRegistro, UserSecurityConfig } from '../types/ponto';

const COLLECTION_PONTOS = 'pontos_registros';
const COLLECTION_CONFIG = 'app_config';
const DOC_CONFIG_ID = 'security_settings';

export function handleFirestoreError(error: unknown, operation: string): never {
  const err = error as FirebaseError;
  const code = err?.code || 'unknown';
  const message = err?.message || 'Erro inesperado no banco de dados Firestore';
  console.error(`Firestore error during ${operation} [${code}]:`, message);
  throw new Error(`Erro ao ${operation} na nuvem: ${message}`);
}

/**
 * Saves a ponto record to Firestore cloud
 */
export async function saveRegistroToFirestore(registro: PontoRegistro): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, COLLECTION_PONTOS, registro.id);
    await setDoc(docRef, {
      ...registro,
      updatedAtFirestore: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, `salvar registro (${registro.data})`);
  }
}

/**
 * Deletes a ponto record from Firestore cloud
 */
export async function deleteRegistroFromFirestore(id: string): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, COLLECTION_PONTOS, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, `excluir registro (${id})`);
  }
}

/**
 * Retrieves all ponto records from Firestore
 */
export async function getAllRegistrosFromFirestore(): Promise<PontoRegistro[]> {
  try {
    await ensureAuthenticated();
    const q = query(collection(db, COLLECTION_PONTOS), orderBy('data', 'desc'));
    const snapshot = await getDocs(q);
    const results: PontoRegistro[] = [];
    snapshot.forEach((d) => {
      results.push(d.data() as PontoRegistro);
    });
    return results;
  } catch (error) {
    console.warn('Erro ao consultar Firestore, operando em modo local:', error);
    return [];
  }
}

/**
 * Subscribes to real-time updates from Firestore
 */
export function subscribeToFirestoreRegistros(
  onUpdate: (registros: PontoRegistro[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    ensureAuthenticated().catch((e) => console.warn('Auth check in subscribe:', e));
    const q = query(collection(db, COLLECTION_PONTOS), orderBy('data', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const results: PontoRegistro[] = [];
        snapshot.forEach((d) => {
          results.push(d.data() as PontoRegistro);
        });
        onUpdate(results);
      },
      (error) => {
        console.warn('Erro no listener em tempo real do Firestore:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.warn('Falha ao registrar listener do Firestore:', error);
    return () => {};
  }
}

/**
 * Saves app security config to Firestore
 */
export async function saveConfigToFirestore(config: UserSecurityConfig): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, COLLECTION_CONFIG, DOC_CONFIG_ID);
    await setDoc(docRef, {
      ...config,
      updatedAtFirestore: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Aviso: Não foi possível salvar config no Firestore:', error);
  }
}

/**
 * Retrieves app security config from Firestore
 */
export async function getConfigFromFirestore(): Promise<UserSecurityConfig | null> {
  try {
    await ensureAuthenticated();
    const querySnapshot = await getDocs(collection(db, COLLECTION_CONFIG));
    let cloudConfig: UserSecurityConfig | null = null;
    querySnapshot.forEach((d) => {
      if (d.id === DOC_CONFIG_ID) {
        cloudConfig = d.data() as UserSecurityConfig;
      }
    });
    return cloudConfig;
  } catch (error) {
    console.warn('Aviso: Não foi possível obter config do Firestore:', error);
    return null;
  }
}
