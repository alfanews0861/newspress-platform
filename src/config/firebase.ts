/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import appletConfig from '../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

const getEnvVar = (name: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
    return import.meta.env[name];
  }
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  return '';
};

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || appletConfig.apiKey || '',
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || appletConfig.authDomain || '',
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || appletConfig.projectId || '',
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || appletConfig.storageBucket || '',
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || appletConfig.messagingSenderId || '',
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || appletConfig.appId || '',
  firestoreDatabaseId: getEnvVar('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || appletConfig.firestoreDatabaseId || '(default)',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);
