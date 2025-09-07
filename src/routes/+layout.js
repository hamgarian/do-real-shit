import { auth } from '$lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';

export async function load({ fetch }) {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve({ user });
    });
  });
}