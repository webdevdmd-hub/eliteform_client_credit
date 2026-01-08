import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

admin.initializeApp();

const ADMIN_EMAIL = 'accounts@dmdligts.com';

const isAdmin = (context: any) => {
  const email = context?.auth?.token?.email;
  return typeof email === 'string' && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

export const deleteClient = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  if (!isAdmin(context)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }

  const uid = data && typeof data.uid === 'string' ? data.uid.trim() : '';
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required.');
  }

  const db = getFirestore();
  const bucket = admin.storage().bucket();

  await bucket.deleteFiles({ prefix: `clients/${uid}/` }).catch((err) => {
    console.warn('storage delete failed', err);
  });

  await Promise.all([
    db.recursiveDelete(db.collection('client_forms').doc(uid)),
    db.recursiveDelete(db.collection('credit_applications').doc(uid)),
    db.recursiveDelete(db.collection('clients').doc(uid))
  ]);

  await admin.auth().deleteUser(uid).catch((err: any) => {
    if (err?.code !== 'auth/user-not-found') {
      throw err;
    }
  });

  return { ok: true };
});
