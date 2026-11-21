/**
 * Cloud Firestore is not enabled for this project (RTDB is the only database).
 * These no-op stand-ins keep legacy mirror code compiling without shipping the
 * ~250 KB Firestore SDK to every visitor. `db` is always null, so none of them run.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const unavailable = (): never => {
  throw new Error('Firestore is disabled');
};
export const collection = (..._args: any[]): any => unavailable();
export const doc = (..._args: any[]): any => unavailable();
interface DisabledSnapshot {
  forEach: (cb: (docSnap: any) => void) => void;
  docs: any[];
  empty: boolean;
}
export const getDocs = (..._args: any[]): Promise<DisabledSnapshot> =>
  Promise.reject(new Error('Firestore is disabled'));
export const setDoc = (..._args: any[]): Promise<void> => Promise.resolve();
export const deleteDoc = (..._args: any[]): Promise<void> => Promise.resolve();
export const updateDoc = (..._args: any[]): Promise<void> => Promise.resolve();
export const onSnapshot = (
  _query: any,
  _next: (snapshot: DisabledSnapshot) => void,
  _error?: (err: Error) => void
): (() => void) => () => {};
export const query = (..._args: any[]): any => unavailable();
export const where = (..._args: any[]): any => unavailable();
