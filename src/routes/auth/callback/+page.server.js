import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
  // Firebase handles OAuth redirects automatically with popup/redirect
  // This page is no longer needed for Firebase Auth
  throw redirect(303, '/');
} 