import { adminDb } from '$lib/firebaseAdmin';

export async function POST({ request, locals }) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  
  try {
    const { label, money, description, status = 'active' } = await request.json();
    const taskData = {
      user_id: locals.user.id,
      label,
      money,
      description,
      status,
      created_at: new Date()
    };
    
    await adminDb.collection('tasks').add(taskData);
    
    // Update leaderboard only for active tasks
    if (status === 'active') {
      await updateLeaderboard(locals.user.id, locals.user.email, money);
    }
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error creating task:', error);
    return new Response(error.message, { status: 400 });
  }
}

export async function GET({ locals }) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  
  try {
    const tasksRef = adminDb.collection('tasks');
    const snapshot = await tasksRef.where('user_id', '==', locals.user.id).get();
    
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return new Response(error.message, { status: 400 });
  }
}

export async function PUT({ request, locals }) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  
  try {
    const { label, status } = await request.json();
    
    const tasksRef = adminDb.collection('tasks');
    const snapshot = await tasksRef
      .where('user_id', '==', locals.user.id)
      .where('label', '==', label)
      .get();
    
    if (snapshot.empty) {
      return new Response('Task not found', { status: 404 });
    }
    
    // Update all matching tasks (should be just one)
    const updatePromises = [];
    snapshot.forEach(doc => {
      updatePromises.push(doc.ref.update({ status }));
    });
    
    await Promise.all(updatePromises);
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error updating task status:', error);
    return new Response(error.message, { status: 400 });
  }
}

export async function DELETE({ request, locals }) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  
  try {
    const { label } = await request.json();
    
    const tasksRef = adminDb.collection('tasks');
    const snapshot = await tasksRef
      .where('user_id', '==', locals.user.id)
      .where('label', '==', label)
      .get();
    
    if (snapshot.empty) {
      return new Response('Task not found', { status: 404 });
    }
    
    // Delete all matching tasks (should be just one)
    const deletePromises = [];
    snapshot.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    
    await Promise.all(deletePromises);
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return new Response(error.message, { status: 400 });
  }
}

async function updateLeaderboard(userId, userEmail, money) {
  try {
    const leaderboardRef = adminDb.collection('leaderboard');
    const userDoc = await leaderboardRef.doc(userId).get();
    
    if (userDoc.exists) {
      const currentData = userDoc.data();
      await leaderboardRef.doc(userId).update({
        total_money: (currentData.total_money || 0) + money,
        email: userEmail
      });
    } else {
      await leaderboardRef.doc(userId).set({
        total_money: money,
        email: userEmail
      });
    }
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}