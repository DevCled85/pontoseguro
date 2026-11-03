import { PontoRegistro, UserSecurityConfig } from '../types/ponto';
import { calculateJornada, getTodayDateString, getYesterdayDateString } from '../utils/timeCalculations';
import {
  saveRegistroToFirestore,
  deleteRegistroFromFirestore,
  getAllRegistrosFromFirestore,
  subscribeToFirestoreRegistros,
  saveConfigToFirestore,
  getConfigFromFirestore,
} from '../firebase/firestoreService';

const DB_NAME = 'ponto_seguro_db';
const DB_VERSION = 1;
const STORE_REGISTROS = 'registros_ponto';
const STORE_CONFIG = 'seguranca_config';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_REGISTROS)) {
        const registrosStore = db.createObjectStore(STORE_REGISTROS, { keyPath: 'id' });
        registrosStore.createIndex('data', 'data', { unique: false });
        registrosStore.createIndex('statusRh', 'statusRh', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };
  });
}

export async function getAllRegistros(): Promise<PontoRegistro[]> {
  try {
    // 1. Direct fetch from Firebase Firestore cloud
    const cloudRecords = await getAllRegistrosFromFirestore();
    if (cloudRecords && cloudRecords.length > 0) {
      // Keep local IndexedDB in sync as fast offline cache
      try {
        const db = await openDatabase();
        const tx = db.transaction(STORE_REGISTROS, 'readwrite');
        const store = tx.objectStore(STORE_REGISTROS);
        for (const rec of cloudRecords) {
          store.put(rec);
        }
      } catch (cacheErr) {
        console.warn('Erro ao atualizar cache local:', cacheErr);
      }
      return cloudRecords;
    }
  } catch (err) {
    console.warn('Firestore inacessível no momento, usando cache local IndexedDB:', err);
  }

  // 2. Fallback to local IndexedDB
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REGISTROS, 'readonly');
    const store = tx.objectStore(STORE_REGISTROS);
    const request = store.getAll();

    request.onsuccess = () => {
      const list: PontoRegistro[] = request.result || [];
      // Sort newest date first
      list.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getRegistroById(id: string): Promise<PontoRegistro | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REGISTROS, 'readonly');
    const store = tx.objectStore(STORE_REGISTROS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a registro directly to Firebase Firestore cloud and local IndexedDB
 */
export async function saveRegistro(registro: PontoRegistro): Promise<void> {
  // 1. Save directly to Firebase Firestore
  try {
    await saveRegistroToFirestore(registro);
  } catch (err) {
    console.warn('Aviso: Firestore temporariamente offline ou erro na nuvem, mantendo no cache:', err);
  }

  // 2. Cache in local IndexedDB
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_REGISTROS, 'readwrite');
    const store = tx.objectStore(STORE_REGISTROS);
    const request = store.put(registro);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes a registro directly from Firebase Firestore and local IndexedDB
 */
export async function deleteRegistro(id: string): Promise<void> {
  // 1. Delete from Firebase Firestore
  try {
    await deleteRegistroFromFirestore(id);
  } catch (err) {
    console.warn('Aviso: Erro ao excluir no Firestore, prosseguindo com exclusão local:', err);
  }

  // 2. Delete from local IndexedDB
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_REGISTROS, 'readwrite');
    const store = tx.objectStore(STORE_REGISTROS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Synchronizes local IndexedDB with remote Firebase Firestore:
 * - Pulls latest records from Firestore into local cache
 * - Pushes any local records missing in cloud to Firestore
 * - Returns sync statistics
 */
export async function syncWithFirestore(): Promise<{
  downloaded: number;
  uploaded: number;
  total: number;
}> {
  try {
    const localList = await getAllRegistros();
    const cloudList = await getAllRegistrosFromFirestore();

    const localMap = new Map<string, PontoRegistro>(localList.map((r) => [r.id, r]));
    const cloudMap = new Map<string, PontoRegistro>(cloudList.map((r) => [r.id, r]));

    let downloaded = 0;
    let uploaded = 0;

    const db = await openDatabase();

    // 1. Ingest newer/missing records from Firestore into local IndexedDB
    for (const cloudReg of cloudList) {
      const localReg = localMap.get(cloudReg.id);
      if (!localReg || new Date(cloudReg.atualizadoEm) > new Date(localReg.atualizadoEm)) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_REGISTROS, 'readwrite');
          const store = tx.objectStore(STORE_REGISTROS);
          const req = store.put(cloudReg);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        downloaded++;
      }
    }

    // 2. Push any local-only records up to Firestore
    for (const localReg of localList) {
      if (!cloudMap.has(localReg.id)) {
        await saveRegistroToFirestore(localReg);
        uploaded++;
      }
    }

    // 3. Sync security configuration
    const localConfig = await getSecurityConfig();
    const cloudConfig = await getConfigFromFirestore();
    if (cloudConfig && localConfig) {
      if (cloudConfig.userName && cloudConfig.userName !== localConfig.userName) {
        await saveSecurityConfig({ ...localConfig, ...cloudConfig });
      }
    } else if (localConfig && !cloudConfig) {
      await saveConfigToFirestore(localConfig);
    }

    const finalList = await getAllRegistros();
    return {
      downloaded,
      uploaded,
      total: finalList.length,
    };
  } catch (error) {
    console.error('Falha na sincronização completa com Firebase:', error);
    const localList = await getAllRegistros();
    return {
      downloaded: 0,
      uploaded: 0,
      total: localList.length,
    };
  }
}

export function listenToCloudUpdates(onNewData: (registros: PontoRegistro[]) => void): () => void {
  return subscribeToFirestoreRegistros(async (cloudRegistros) => {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_REGISTROS, 'readwrite');
      const store = tx.objectStore(STORE_REGISTROS);
      store.clear();
      for (const reg of cloudRegistros) {
        store.put(reg);
      }
      tx.oncomplete = () => {
        onNewData(cloudRegistros);
      };
      tx.onerror = () => {
        onNewData(cloudRegistros);
      };
    } catch (e) {
      console.warn('Erro ao mesclar atualizações em tempo real do Firestore:', e);
      onNewData(cloudRegistros);
    }
  });
}

export async function getSecurityConfig(): Promise<UserSecurityConfig | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONFIG, 'readwrite');
    const store = tx.objectStore(STORE_CONFIG);
    const request = store.get('security');

    request.onsuccess = async () => {
      let config: UserSecurityConfig | null = request.result ? request.result.value : null;
      const targetPinHash = await hashPin('9655');

      if (!config) {
        config = {
          hasPin: true,
          pinHash: targetPinHash,
          autoLockMinutes: 15,
          lastActiveTimestamp: Date.now(),
          userName: 'Cledson do Nascimento Pereira',
          jornadaPadraoMinutos: 480,
          empresaPadrao: 'Vidronox',
        };
        store.put({ key: 'security', value: config });
        saveConfigToFirestore(config).catch(() => {});
      } else if (
        config.userName === 'Antonio Costa' ||
        config.userName === 'Trabalhador' ||
        config.empresaPadrao !== 'Vidronox' ||
        config.pinHash !== targetPinHash ||
        config.securityQuestion
      ) {
        config.userName = 'Cledson do Nascimento Pereira';
        config.empresaPadrao = 'Vidronox';
        config.pinHash = targetPinHash;
        delete config.securityQuestion;
        delete config.securityAnswerHash;
        store.put({ key: 'security', value: config });
        saveConfigToFirestore(config).catch(() => {});
      }

      resolve(config);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSecurityConfig(config: UserSecurityConfig): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CONFIG, 'readwrite');
    const store = tx.objectStore(STORE_CONFIG);
    const request = store.put({ key: 'security', value: config });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  saveConfigToFirestore(config).catch((err) => {
    console.warn('Aviso: Config salva localmente, nuvem pendente:', err);
  });
}

export async function exportFullData(): Promise<string> {
  const registros = await getAllRegistros();
  const config = await getSecurityConfig();
  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    config: config ? { ...config, pinHash: 'REDACTED_FOR_EXPORT' } : null,
    registros,
  };
  return JSON.stringify(exportPayload, null, 2);
}

export async function importFullData(jsonString: string): Promise<number> {
  const parsed = JSON.parse(jsonString);
  if (!parsed.registros || !Array.isArray(parsed.registros)) {
    throw new Error('Formato de arquivo de backup inválido.');
  }

  const db = await openDatabase();
  let count = 0;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_REGISTROS, 'readwrite');
    const store = tx.objectStore(STORE_REGISTROS);

    for (const reg of parsed.registros) {
      if (reg.id && reg.data) {
        store.put(reg);
        // Also sync imported item to Firestore
        saveRegistroToFirestore(reg).catch(() => {});
        count++;
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return count;
}

// Generate an SVG receipt data URL for realistic initial preview canhotos
function createSampleCanhotoReceiptSvg(
  empresa: string,
  data: string,
  nsr: string,
  e1: string,
  s1: string,
  e2: string,
  s2: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="580" viewBox="0 0 400 580" style="background:#fcfbf7;font-family:'Courier New', monospace;color:#222;">
    <rect width="400" height="580" fill="#fcfbf7"/>
    <!-- Thermal paper jagged tear edge -->
    <path d="M 0,0 L 20,8 L 40,0 L 60,8 L 80,0 L 100,8 L 120,0 L 140,8 L 160,0 L 180,8 L 200,0 L 220,8 L 240,0 L 260,8 L 280,0 L 300,8 L 320,0 L 340,8 L 360,0 L 380,8 L 400,0 L 400,570 L 380,580 L 360,570 L 340,580 L 320,570 L 300,580 L 280,570 L 260,580 L 240,570 L 220,580 L 200,570 L 180,580 L 160,570 L 140,580 L 120,570 L 100,580 L 80,570 L 60,580 L 40,570 L 20,580 L 0,570 Z" fill="#fff" stroke="#e2ded4" stroke-width="1.5"/>
    
    <g transform="translate(30, 45)" fill="#2a2a2a" font-size="12">
      <text x="170" y="0" text-anchor="middle" font-weight="bold" font-size="13">COMPROVANTE DE REGISTRO DE PONTO</text>
      <text x="170" y="16" text-anchor="middle" font-size="10">PORTARIA 671 / 1510 MTE - REP-C</text>
      <line x1="0" y1="28" x2="340" y2="28" stroke="#333" stroke-dasharray="4,3"/>
      
      <text x="0" y="48" font-size="11" font-weight="bold">${empresa || 'VIDRONOX'}</text>
      <text x="0" y="64" font-size="10">CNPJ: 14.288.920/0001-44</text>
      <text x="0" y="80" font-size="10">LOCAL: SEDE OPERACIONAL</text>
      
      <line x1="0" y1="94" x2="340" y2="94" stroke="#444" stroke-dasharray="2,2"/>
      
      <text x="0" y="114" font-size="11">COLABORADOR: CLEDSON DO NASCIMENTO PEREIRA</text>
      <text x="0" y="130" font-size="10">PIS/CPF: 128.994.021-90</text>
      
      <line x1="0" y1="144" x2="340" y2="144" stroke="#333" stroke-width="1"/>
      
      <text x="0" y="168" font-size="12" font-weight="bold">DATA: ${data}</text>
      <text x="0" y="186" font-size="11">NSR (SEQ. REGISTRO): ${nsr}</text>
      
      <rect x="0" y="202" width="340" height="150" fill="#f8f7f0" stroke="#d5d0c2" rx="4"/>
      <text x="15" y="228" font-size="11" font-weight="bold">MARCAÇÕES DESTE DIA:</text>
      
      <text x="25" y="256" font-size="12">1ª ENTRADA :</text>
      <text x="220" y="256" font-size="14" font-weight="bold">${e1 || '--:--'}</text>
      
      <text x="25" y="284" font-size="12">1ª SAÍDA (ALMOÇO) :</text>
      <text x="220" y="284" font-size="14" font-weight="bold">${s1 || '--:--'}</text>
      
      <text x="25" y="312" font-size="12">2ª ENTRADA (VOLTA) :</text>
      <text x="220" y="312" font-size="14" font-weight="bold">${e2 || '--:--'}</text>
      
      <text x="25" y="340" font-size="12">2ª SAÍDA (FIM EXP.) :</text>
      <text x="220" y="340" font-size="14" font-weight="bold">${s2 || '--:--'}</text>
      
      <line x1="0" y1="368" x2="340" y2="368" stroke="#333" stroke-dasharray="3,3"/>
      
      <!-- Authentic REP Barcode mock -->
      <g transform="translate(40, 385)">
        <rect x="0" y="0" width="3" height="42" fill="#222"/>
        <rect x="5" y="0" width="1" height="42" fill="#222"/>
        <rect x="8" y="0" width="4" height="42" fill="#222"/>
        <rect x="15" y="0" width="2" height="42" fill="#222"/>
        <rect x="20" y="0" width="6" height="42" fill="#222"/>
        <rect x="29" y="0" width="1" height="42" fill="#222"/>
        <rect x="33" y="0" width="3" height="42" fill="#222"/>
        <rect x="39" y="0" width="5" height="42" fill="#222"/>
        <rect x="47" y="0" width="2" height="42" fill="#222"/>
        <rect x="52" y="0" width="4" height="42" fill="#222"/>
        <rect x="59" y="0" width="2" height="42" fill="#222"/>
        <rect x="64" y="0" width="6" height="42" fill="#222"/>
        <rect x="73" y="0" width="1" height="42" fill="#222"/>
        <rect x="77" y="0" width="3" height="42" fill="#222"/>
        <rect x="83" y="0" width="5" height="42" fill="#222"/>
        <rect x="91" y="0" width="2" height="42" fill="#222"/>
        <rect x="96" y="0" width="4" height="42" fill="#222"/>
        <rect x="103" y="0" width="1" height="42" fill="#222"/>
        <rect x="107" y="0" width="5" height="42" fill="#222"/>
        <rect x="115" y="0" width="3" height="42" fill="#222"/>
        <rect x="121" y="0" width="1" height="42" fill="#222"/>
        <rect x="125" y="0" width="6" height="42" fill="#222"/>
        <rect x="134" y="0" width="2" height="42" fill="#222"/>
        <rect x="139" y="0" width="4" height="42" fill="#222"/>
        <rect x="146" y="0" width="3" height="42" fill="#222"/>
        <rect x="152" y="0" width="1" height="42" fill="#222"/>
        <rect x="156" y="0" width="5" height="42" fill="#222"/>
        <rect x="164" y="0" width="2" height="42" fill="#222"/>
        <rect x="169" y="0" width="4" height="42" fill="#222"/>
        <rect x="176" y="0" width="3" height="42" fill="#222"/>
        <rect x="182" y="0" width="5" height="42" fill="#222"/>
        <rect x="190" y="0" width="2" height="42" fill="#222"/>
        <rect x="195" y="0" width="6" height="42" fill="#222"/>
        <rect x="204" y="0" width="1" height="42" fill="#222"/>
        <rect x="208" y="0" width="4" height="42" fill="#222"/>
        <rect x="215" y="0" width="2" height="42" fill="#222"/>
        <rect x="220" y="0" width="5" height="42" fill="#222"/>
        <rect x="228" y="0" width="3" height="42" fill="#222"/>
        <rect x="234" y="0" width="1" height="42" fill="#222"/>
        <rect x="238" y="0" width="6" height="42" fill="#222"/>
        <rect x="247" y="0" width="2" height="42" fill="#222"/>
        <rect x="252" y="0" width="4" height="42" fill="#222"/>
        <text x="130" y="55" text-anchor="middle" font-size="9">REP Nº 00049210294109</text>
      </g>
      
      <text x="170" y="470" text-anchor="middle" font-size="9" fill="#666">CONSERVE ESTE COMPROVANTE</text>
      <text x="170" y="482" text-anchor="middle" font-size="8" fill="#888">DOCUMENTO LEGAL DE PROVA CONFORME CLT</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function purgeMockData(): Promise<void> {
  const mockIds = ['ponto-divergencia-1', 'ponto-hoje-2', 'ponto-anteontem-3'];
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_REGISTROS, 'readwrite');
    const store = tx.objectStore(STORE_REGISTROS);
    for (const id of mockIds) {
      store.delete(id);
    }
  } catch (e) {
    console.warn('Erro ao limpar dados locais mockados:', e);
  }
}

export async function seedInitialDataIfEmpty(): Promise<boolean> {
  // Purge any residual mock records to ensure a completely clean zeroed database
  await purgeMockData();

  // Set default initial security config (PIN: 9655) if not already set
  const existingConfig = await getSecurityConfig();
  if (!existingConfig) {
    const defaultConfig: UserSecurityConfig = {
      hasPin: true,
      pinHash: await hashPin('9655'),
      autoLockMinutes: 15,
      lastActiveTimestamp: Date.now(),
      userName: 'Cledson do Nascimento Pereira',
      jornadaPadraoMinutos: 480,
      empresaPadrao: 'Vidronox',
    };
    await saveSecurityConfig(defaultConfig);
  }

  return false;
}

export async function hashPin(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
