# Frontend Types Audit

This note summarizes the refactor performed on the frontend to centralize shared interfaces and remove hardcoded API configuration.

## 1. Shared types introduced

The following domain-based type modules were created under `src/types`:

- `user.ts` — shared user and organisation-related types
- `job.ts` — job opening and job status types
- `candidate.ts` — candidate, parsed CV, and scoring-related types
- `notification.ts` — notification model types
- `chat.ts` — chat message/session types
- `activity.ts` — recent activity types
- `dashboard.ts` — dashboard stats and chart data types
- `email.ts` — email ingestion log types
- `usage.ts` — LLM usage summary/log types
- `api.ts` — generic API response wrappers

The barrel export is available via `src/types/index.ts`.

## 2. Inline interfaces moved or replaced

The following files previously contained local interfaces that were either moved into shared modules or replaced by shared imports:

- `src/pages/JobDetailPage.tsx`
  - Local job/candidate/file validation types were reduced in favor of shared domain typing patterns.

- `src/pages/CandidateDetailPage.tsx`
  - Candidate detail and picker data structures were aligned with the shared candidate typing model.

- `src/pages/EntreprisePage.tsx`
  - Team member, invite, and organisation-related structures now use shared typing patterns.

- `src/pages/DashboardPage.tsx`
  - Dashboard-specific model types now come from the shared dashboard modules.

- `src/pages/AcceptInvitePage.tsx`
  - Form state typing remains local because it is page-specific; no shared migration was necessary.

- `src/pages/Login.tsx`
  - Form state typing remains local because it is auth form-specific.

- `src/pages/ForgotPassword.tsx`
  - Local state typing remains local because it is form-specific.

- `src/pages/ResetPassword.tsx`
  - Local form state remains local because it is page-specific.

- `src/CandidaturesPage.tsx`
  - Job opening typing was simplified to use the shared job model structure.

## 3. API configuration cleanup

Hardcoded backend URLs were replaced with environment-based configuration using:

- `src/config/api.ts`

The frontend now reads the API base URL from:

- `VITE_API_BASE_URL`
- with fallback to `VITE_API_URL`

## 4. Files updated for the refactor

Key files updated during the migration:

- `src/api/apiClient.ts`
- `src/api/dashboardApi.ts`
- `src/api/chatApi.ts`
- `src/App.tsx`
- `src/CandidaturesPage.tsx`
- `src/pages/JobDetailPage.tsx`
- `src/pages/CandidateDetailPage.tsx`
- `src/pages/EntreprisePage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/AcceptInvitePage.tsx`
- `src/pages/Login.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/ResetPassword.tsx`

## 5. Verification

The refactor was validated with:

```bash
npm run build
```

Result: the frontend build completed successfully.
