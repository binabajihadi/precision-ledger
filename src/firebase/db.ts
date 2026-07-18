import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './config';
import { Trade, CapitalFlow, DynamicConfig } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  // For reads (LIST, GET), return the error details gracefully instead of throwing to prevent crashing the async listeners
  if (operationType === OperationType.LIST || operationType === OperationType.GET) {
    return errInfo;
  }
  throw new Error(JSON.stringify(errInfo));
}

// Recursively converts undefined values to null to avoid Firestore "Unsupported field value: undefined" error
export function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item)) as any;
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        sanitized[key] = val === undefined ? null : sanitizeData(val);
      }
    }
    return sanitized;
  }
  return obj;
}

// Trades CRUD with user security scoping
export const saveTrade = async (userId: string, trade: Trade) => {
  const finalUserId = auth.currentUser?.uid || userId;
  if (!finalUserId) {
    throw new Error('User is not authenticated. Cannot save trade without a valid userId.');
  }
  const tradeId = trade.id || doc(collection(db, 'placeholder')).id;
  const path = `users/${finalUserId}/trades/${tradeId}`;
  try {
    const docRef = doc(db, 'users', finalUserId, 'trades', tradeId);
    const sanitizedTrade = sanitizeData({ ...trade, id: tradeId, userId: finalUserId });
    await setDoc(docRef, sanitizedTrade, { merge: true });
  } catch (error) {
    console.error(`[Firestore] Firestore error saving trade ${tradeId}:`, error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteTrade = async (userId: string, tradeId: string) => {
  const finalUserId = auth.currentUser?.uid || userId;
  const path = `users/${finalUserId}/trades/${tradeId}`;
  try {
    const docRef = doc(db, 'users', finalUserId, 'trades', tradeId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`[Firestore] Firestore error deleting trade ${tradeId}:`, error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const listenTrades = (userId: string, callback: (trades: Trade[]) => void) => {
  const finalUserId = auth.currentUser?.uid || userId;
  const path = `users/${finalUserId}/trades`;
  if (!finalUserId) {
    throw new Error('User is not authenticated. Cannot listen to trades without a valid userId.');
  }
  const q = collection(db, 'users', finalUserId, 'trades');

  return onSnapshot(q, (snapshot) => {
    const trades: Trade[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Trade;
      trades.push({ ...data, id: doc.id });
    });
    
    // Sort trades chronologically in memory (descending by date)
    trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(trades);
  }, (error) => {
    console.error(`[Firestore] Firestore error listening to trades:`, error);
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
};

// Transactions CRUD with user security scoping
export const updateCapitalFlow = async (userId: string, flow: CapitalFlow) => {
  const finalUserId = auth.currentUser?.uid || userId;
  if (!finalUserId) {
    throw new Error('User is not authenticated. Cannot save transaction without a valid userId.');
  }
  const flowId = flow.id || doc(collection(db, 'placeholder')).id;
  const path = `users/${finalUserId}/transactions/${flowId}`;
  try {
    const docRef = doc(db, 'users', finalUserId, 'transactions', flowId);
    const sanitizedFlow = sanitizeData({ ...flow, id: flowId, userId: finalUserId });
    await setDoc(docRef, sanitizedFlow, { merge: true });
  } catch (error) {
    console.error(`[Firestore] Firestore error saving transaction ${flowId}:`, error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const addTransaction = updateCapitalFlow;

export const deleteTransaction = async (userId: string, transactionId: string) => {
  const finalUserId = auth.currentUser?.uid || userId;
  const path = `users/${finalUserId}/transactions/${transactionId}`;
  try {
    const docRef = doc(db, 'users', finalUserId, 'transactions', transactionId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`[Firestore] Firestore error deleting transaction ${transactionId}:`, error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const listenTransactions = (userId: string, callback: (flows: CapitalFlow[]) => void) => {
  const finalUserId = auth.currentUser?.uid || userId;
  const path = `users/${finalUserId}/transactions`;
  if (!finalUserId) {
    throw new Error('User is not authenticated. Cannot listen to transactions without a valid userId.');
  }
  const q = collection(db, 'users', finalUserId, 'transactions');

  return onSnapshot(q, (snapshot) => {
    const flows: CapitalFlow[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as CapitalFlow;
      flows.push({ ...data, id: doc.id });
    });

    // Sort flows in memory ascending by date
    flows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    callback(flows);
  }, (error) => {
    console.error(`[Firestore] Firestore error listening to transactions:`, error);
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
};

// User Settings CRUD
export const saveUserSettings = async (userId: string, config: Partial<DynamicConfig>) => {
  const finalUserId = auth.currentUser?.uid || userId;
  const path = `users/${finalUserId}`;
  try {
    if (!finalUserId) {
      throw new Error('User is not authenticated. Cannot save settings without a valid userId.');
    }
    const docRef = doc(db, 'users', finalUserId);
    const sanitizedConfig = sanitizeData(config);
    await setDoc(docRef, sanitizedConfig, { merge: true });
  } catch (error) {
    console.error(`[Firestore] Firestore error saving settings for user ${userId}:`, error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const listenUserSettings = (userId: string, callback: (config: Partial<DynamicConfig> | null) => void) => {
  const finalUserId = auth.currentUser?.uid || userId;
  const path = `users/${finalUserId}`;
  if (!finalUserId) {
    throw new Error('User is not authenticated. Cannot listen to settings without a valid userId.');
  }
  const docRef = doc(db, 'users', finalUserId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as DynamicConfig);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error(`[Firestore] Firestore error listening to user settings:`, error);
    handleFirestoreError(error, OperationType.GET, path);
    callback(null);
  });
};

// Unified fetchUserData real-time synchronization function as requested
export const fetchUserData = (
  userId: string,
  callbacks: {
    onTrades: (trades: Trade[]) => void;
    onTransactions: (flows: CapitalFlow[]) => void;
    onSettings: (config: Partial<DynamicConfig> | null) => void;
  }
) => {
  const unsubTrades = listenTrades(userId, callbacks.onTrades);
  const unsubTransactions = listenTransactions(userId, callbacks.onTransactions);
  const unsubSettings = listenUserSettings(userId, callbacks.onSettings);

  return () => {
    unsubTrades();
    unsubTransactions();
    unsubSettings();
  };
};
