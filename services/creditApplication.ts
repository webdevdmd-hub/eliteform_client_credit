import { db } from './firebase';
import { CreditApplication } from '../types';

type CreditSaveInput = {
  userId: string;
  creditApplication: CreditApplication;
  creditDocId?: string | null;
  status?: 'draft' | 'submitted';
  submittedAt?: number;
};

const basePayload = (
  userId: string,
  creditApplication: CreditApplication,
  status: 'draft' | 'submitted',
  creditDocId?: string | null,
  submittedAt?: number
) => {
  const now = Date.now();
  return {
    clientId: userId,
    uid: userId,
    creditApplication,
    status,
    updatedAt: now,
    ...(submittedAt ? { submittedAt } : {}),
    ...(creditDocId ? {} : { createdAt: now })
  };
};

export const saveCreditDraft = async (input: CreditSaveInput): Promise<string> => {
  const { userId, creditApplication, creditDocId, status = 'draft' } = input;
  const payload = basePayload(userId, creditApplication, status, creditDocId);
  const ref = db.collection('credit_applications').doc(userId);
  await ref.set(payload, { merge: true });
  return ref.id;
};

export const submitCreditApplication = async (input: CreditSaveInput): Promise<string> => {
  const { userId, creditApplication, creditDocId } = input;
  const submittedAt = Date.now();
  const payload = basePayload(userId, creditApplication, 'submitted', creditDocId, submittedAt);
  const ref = db.collection('credit_applications').doc(userId);
  await ref.set(payload, { merge: true });
  return ref.id;
};
