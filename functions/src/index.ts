import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

admin.initializeApp();

const ADMIN_EMAILS = new Set([
  'accounts@dmdligts.com',
  'accounts@dmdlights.com'
]);
const ALLOWED_ORIGINS = new Set([
  'https://registration.dmdapps.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173'
]);

const isAdmin = (context: any) => {
  const email = context?.auth?.token?.email;
  return typeof email === 'string' && ADMIN_EMAILS.has(email.toLowerCase());
};

const setCorsHeaders = (req: functions.https.Request, res: functions.Response<any>) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
};

export const deleteClient = functions.https.onRequest(async (req, res) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method-not-allowed' });
    return;
  }

  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ ok: false, error: 'unauthenticated' });
    return;
  }

  let decodedToken: admin.auth.DecodedIdToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(match[1]);
  } catch (err) {
    res.status(401).json({ ok: false, error: 'unauthenticated' });
    return;
  }

  if (!isAdmin({ auth: { token: decodedToken } })) {
    console.warn('deleteClient permission denied', {
      email: decodedToken.email || null,
      uid: decodedToken.uid
    });
    res.status(403).json({ ok: false, error: 'permission-denied' });
    return;
  }

  const uid = typeof req.body?.uid === 'string' ? req.body.uid.trim() : '';
  if (!uid) {
    res.status(400).json({ ok: false, error: 'invalid-argument' });
    return;
  }

  try {
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

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('deleteClient failed', err);
    res.status(500).json({ ok: false, error: 'internal' });
  }
});
