import { json } from '@sveltejs/kit';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const db = getFirestore();

export async function GET({ request }) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const uid = decodedToken.uid;

        const userDoc = await db.collection('users').doc(uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            return json({ username: userData.username || '' });
        } else {
            return json({ username: '' });
        }
    } catch (error) {
        console.error('Error getting username:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST({ request }) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const uid = decodedToken.uid;

        const { username } = await request.json();
        
        if (!username || username.trim().length === 0) {
            return json({ error: 'Username is required' }, { status: 400 });
        }

        if (username.length > 20) {
            return json({ error: 'Username too long' }, { status: 400 });
        }

        // Check if username is already taken
        const usersSnapshot = await db.collection('users').where('username', '==', username.trim()).get();
        if (!usersSnapshot.empty) {
            return json({ error: 'Username already taken' }, { status: 409 });
        }

        // Save username
        await db.collection('users').doc(uid).set({
            username: username.trim(),
            email: decodedToken.email,
            createdAt: new Date()
        }, { merge: true });

        return json({ success: true, username: username.trim() });
    } catch (error) {
        console.error('Error saving username:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}
