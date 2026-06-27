# Build Specification: Fitness App

This document outlines the technical architecture, development standards, and deployment strategy for the Fitness App.

## 1. Environment & Setup

### Requirements
- **Node.js**: LTS version (ensure `npm` or `yarn` is installed).
- **Environment Variables**: Managed via `.env` files (ignored in Git). Required variables: `API_URL`, `FIREBASE_CONFIG` (or equivalent backend provider).

### Installation
```bash
npm install
```

### Development
```bash
npx expo start
```

---

## 2. Technical Stack

*   **Framework**: Expo SDK (Latest Stable)
*   **Language**: TypeScript (Strict mode)
*   **Routing**: Expo Router (File-based routing)
*   **Styling**: React Native `StyleSheet` / Vanilla CSS
*   **State Management**: React Context API
*   **Persistence**: `AsyncStorage` (local) / Firebase (remote sync)
*   **Type Safety**: Definitive interfaces for all data structures in `types.ts`

---

## 3. Directory Structure

```text
/
├── app/            # Expo Router screens (file-based navigation)
├── components/     # UI components (atoms, molecules, organisms)
├── context/        # Global state providers (User, Auth)
├── hooks/          # Custom business logic hooks
├── constants/      # App configuration, colors, MET tables
├── utils/          # Helper functions (calculators, formatters)
└── types/          # Global TypeScript interface definitions
```

---

## 4. Development Standards

### Role-Based Access Control (RBAC)
- All navigation must be protected by authentication guards in `(auth)` layouts.
- Trainer functionality must be gated by a `role === 'trainer'` check in both the UI and data access layers.

### Data Modeling
- **Entities**: Define standard schemas for `User`, `WorkoutTemplate`, `WorkoutLog`, `Exercise`, and `Goal`.
- **Relationships**: Ensure strict mapping between `TrainerID` and assigned `AthleteIDs`.

### UI/UX Guidelines
- Follow platform-native design primitives (iOS/Android).
- Use `ThemedText` and `ThemedView` components for consistent dark/light mode support.
- Interactive feedback should be provided for all user actions.

---

## 5. Testing & Validation

- **Unit Tests**: Business logic in `utils/` and `hooks/` must be covered by unit tests.
- **Type Checking**: Run `tsc --noEmit` to ensure type integrity before any build.
- **Linting**: Enforce project-wide style guidelines using `eslint` and `prettier`.

---

## 6. Deployment Strategy

- **Development**: Expo Go for rapid iteration.
- **Production**: Generate EAS (Expo Application Services) builds for native deployment to App Store/Play Store.
- **Backend**: Firebase setup required for real-time synchronization of logs and social feed features.
