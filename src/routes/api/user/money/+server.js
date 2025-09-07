import { adminDb } from '$lib/firebaseAdmin';

export async function GET({ locals }) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  
  try {
    const userRef = adminDb.collection('users').doc(locals.user.id);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      return new Response(JSON.stringify({ balance: userData.balance || 0 }), { status: 200 });
    } else {
      // Create user document with default balance
      await userRef.set({
        balance: 0,
        email: locals.user.email,
        created_at: new Date()
      });
      return new Response(JSON.stringify({ balance: 0 }), { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching user money balance:', error);
    return new Response(error.message, { status: 400 });
  }
}

export async function POST({ request, locals }) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  
  try {
    const { balance } = await request.json();
    
    const userRef = adminDb.collection('users').doc(locals.user.id);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      await userRef.update({
        balance: balance,
        updated_at: new Date()
      });
    } else {
      await userRef.set({
        balance: balance,
        email: locals.user.email,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    
    return new Response(JSON.stringify({ success: true, balance }), { status: 200 });
  } catch (error) {
    console.error('Error saving user money balance:', error);
    return new Response(error.message, { status: 400 });
  }
}
