import { adminAuth } from '$lib/firebaseAdmin';

export async function handle({ event, resolve }) {
  const authHeader = event.request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  
  if (token) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      event.locals.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        ...decodedToken
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }
  
  return await resolve(event);
}