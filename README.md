# Question Timer

Track how long you spend on each question during a study or exam session.
Study blocks are persisted in **Firebase Firestore** behind **Google sign-in**.

## Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication → Sign-in method → Google**.
3. Under **Authentication → Settings → Authorized domains**, keep `localhost` for local dev.
4. Create a **Cloud Firestore** database (production or test mode; then apply the rules below).
5. Under Project settings → Your apps, register a **Web** app and copy the config values.
6. Copy env file and fill in values:

```bash
cp .env.example .env
```

7. Install and run:

```bash
pnpm install
pnpm dev
```

### Firestore security rules

Paste these rules in Firestore → Rules (so each signed-in user can only access their own data):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/studyBlocks/{blockId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Usage

1. Sign in with Google.
2. Set **Started at** and **Questions planned**.
3. Optionally change the first question number — later rows auto-increment.
4. Tap **Tap when done** on each row when you finish that question.
5. Watch the progress bar, per-question duration, and average trend (color + arrow).
6. Tap **New study block** to start another session (newest first). Changes save automatically.
7. Tap **Delete** on a block to soft-delete it (confirm first). Use **Undo** in the toast to restore.

Deleted blocks stay in Firestore with a `deletedAt` timestamp and are hidden from the app until restored.

Finish times show as `HH:MM` but are stored with full timestamps for accurate averages.

