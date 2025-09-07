// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// Add any custom properties to locals here
		}
		interface PageData {
			// Add any custom properties to page data here
		}
		interface PageState {
			// Add any custom properties to page state here
		}
		interface Platform {
			env: {
				// Server-side environment variables
				GOOGLE_API_KEY: string;
				FIREBASE_PROJECT_ID: string;
				FIREBASE_PRIVATE_KEY: string;
				FIREBASE_CLIENT_EMAIL: string;
				
				// Client-side environment variables (VITE_ prefix)
				VITE_FIREBASE_API_KEY: string;
				VITE_FIREBASE_AUTH_DOMAIN: string;
				VITE_FIREBASE_PROJECT_ID: string;
				VITE_FIREBASE_STORAGE_BUCKET: string;
				VITE_FIREBASE_MESSAGING_SENDER_ID: string;
				VITE_FIREBASE_APP_ID: string;
				VITE_FIREBASE_MEASUREMENT_ID: string;
				
				// Cloudflare bindings (uncomment and add as needed)
				// COUNTER: DurableObjectNamespace;
				// MY_KV: KVNamespace;
				// MY_D1: D1Database;
				// MY_R2: R2Bucket;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
		// interface Session {}
		// interface Stuff {}
	}
}

export {};
