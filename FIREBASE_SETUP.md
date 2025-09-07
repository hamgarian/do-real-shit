# Firebase Setup Instructions

This application has been migrated from Supabase to Firebase. Follow these steps to set up Firebase for your project.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name and follow the setup wizard
4. Enable Google Analytics if desired (optional)

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Google" as a sign-in provider
5. Add your domain to authorized domains (localhost for development)

## 3. Create Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database

## 4. Get Firebase Configuration

### For Client-Side Configuration (VITE_* variables):

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project** (or create one if you haven't)
3. **Click the gear icon** (⚙️) in the top left → "Project settings"
4. **Scroll down to "Your apps"** section
5. **If you don't have a web app yet**:
   - Click "Add app" button
   - Select the Web icon (</>)
   - Register your app with a nickname (e.g., "do-real-shit-web")
   - Click "Register app"
6. **Copy the configuration object** that looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123...",
     measurementId: "G-ABC123..."
   };
   ```
7. **Use these values** in your `.env` file:
   - `VITE_FIREBASE_API_KEY` = the `apiKey` value
   - `VITE_FIREBASE_AUTH_DOMAIN` = the `authDomain` value
   - `VITE_FIREBASE_PROJECT_ID` = the `projectId` value
   - `VITE_FIREBASE_STORAGE_BUCKET` = the `storageBucket` value
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = the `messagingSenderId` value
   - `VITE_FIREBASE_APP_ID` = the `appId` value
   - `VITE_FIREBASE_MEASUREMENT_ID` = the `measurementId` value (optional)

### Quick Visual Guide:
1. **Firebase Console** → Your Project → ⚙️ Settings
2. **General tab** → Scroll to "Your apps" → Copy web app config
3. **Service accounts tab** → Generate new private key → Download JSON
4. **Copy values** from both sources to your `.env` file

## 5. Update Configuration Files

### Update `src/lib/firebaseClient.js`:
Replace the placeholder configuration with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

### For Server-Side Configuration (FIREBASE_* variables):

1. **In the same Project Settings page**, click on the "Service accounts" tab
2. **Click "Generate new private key"** button
3. **Click "Generate key"** in the confirmation dialog
4. **Download the JSON file** (it will be named something like `your-project-firebase-adminsdk-xxxxx.json`)
5. **Open the JSON file** and copy these values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and \n characters)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `client_id` → `FIREBASE_CLIENT_ID`
   - `client_x509_cert_url` → `FIREBASE_CLIENT_CERT_URL`

### Create your `.env` file:
Create a `.env` file in your project root with these values:
   ```
   # Firebase Client Configuration (for frontend)
   # Get these values from your Firebase project settings > General > Your apps
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
   
   # Firebase Admin Service Account Configuration (for backend)
   # Get these values from your Firebase project settings > Service Accounts
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
   ```
5. The application will automatically use these environment variables and will throw an error if any are missing

**Important for GitHub**: The `.env` file is already in `.gitignore`, so your secrets won't be committed to GitHub. The application will fail to start without proper environment variables, which is the intended behavior for security.

## 6. Set up Firestore Collections

The application expects these collections in Firestore:

### `tasks` collection:
- Document structure:
  ```json
  {
    "user_id": "string",
    "label": "string", 
    "money": "number",
    "description": "string",
    "created_at": "timestamp"
  }
  ```

### `leaderboard` collection:
- Document structure:
  ```json
  {
    "total_money": "number",
    "email": "string"
  }
  ```
- Document ID should be the user's UID

## 7. Security Rules (Optional but Recommended)

For production, set up Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own tasks
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.user_id;
    }
    
    // Leaderboard is readable by all authenticated users
    match /leaderboard/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 8. Environment Variables (Optional)

For better security, you can use environment variables:

1. Create a `.env` file in your project root
2. Add your Firebase config:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=your-app-id
   ```

3. Update `firebaseClient.js` to use environment variables:
   ```javascript
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
     appId: import.meta.env.VITE_FIREBASE_APP_ID
   };
   ```

## 9. Test the Application

1. Run `npm run dev`
2. Try signing in with Google
3. Create some tasks to test the functionality
4. Check that the leaderboard updates correctly

## Migration Notes

- The application now uses Firebase Auth instead of Supabase Auth
- Firestore replaces Supabase's PostgreSQL database
- All API routes have been updated to use Firebase Admin SDK
- Authentication state management has been updated to use Firebase's `onAuthStateChanged`
- The auth callback route is no longer needed for Firebase (handled by popup/redirect)

## Troubleshooting

### Current Error: "Failed to parse private key"
If you're seeing this error, it means the Firebase Admin SDK can't find valid service account credentials. To fix this:

1. **Quick Fix (Development)**: The app will now work without service account credentials for client-side operations, but server-side operations (like creating tasks) won't work until you set up the service account.

2. **Proper Fix**: Follow the steps above to create a service account and set up the `.env` file with the correct credentials.

### Other Common Issues:
- Make sure your Firebase project has the correct APIs enabled (Authentication, Firestore)
- Check that your domain is added to authorized domains in Firebase Auth settings
- Verify that your service account key has the correct permissions
- Check the browser console for any Firebase-related errors
- Ensure your `.env` file is in the project root (same level as `package.json`)
