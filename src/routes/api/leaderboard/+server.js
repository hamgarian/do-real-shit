import { adminDb } from '$lib/firebaseAdmin';

export async function GET() {
  try {
    // Get all users with usernames
    const usersRef = adminDb.collection('users');
    const usersSnapshot = await usersRef.get();
    
    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.username) {
        users.push({
          id: doc.id,
          username: userData.username,
          email: userData.email || '',
          total_money: userData.balance || 0 // Use user's balance from users collection
        });
      }
    });
    
    // Get leaderboard data to merge with user data
    const leaderboardRef = adminDb.collection('leaderboard');
    const leaderboardSnapshot = await leaderboardRef.get();
    
    const leaderboardData = {};
    leaderboardSnapshot.forEach(doc => {
      leaderboardData[doc.id] = doc.data();
    });
    
    // Use user balance as the primary source, fallback to leaderboard data
    const mergedData = users.map(user => ({
      ...user,
      total_money: user.total_money // Already set from user's balance
    }));
    
    // Sort by total_money descending
    mergedData.sort((a, b) => b.total_money - a.total_money);
    
    console.log('Leaderboard data:', mergedData); // Debug log
    
    return new Response(JSON.stringify(mergedData), { status: 200 });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return new Response(error.message, { status: 400 });
  }
}   