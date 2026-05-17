# Implementation Plan

## Phase 0: Project setup

Deliverables:

- Monorepo structure with `frontend/`, `api/`, and shared configuration.
- TypeScript configuration for frontend and backend.
- Formatting and linting setup.
- Docker Compose skeleton.
- Environment variable examples.

Tasks:

1. Initialize Vite React TypeScript app.
2. Add Tailwind CSS and shadcn/ui.
3. Initialize Express TypeScript API.
4. Add PostgreSQL client and migration tooling.
5. Create Dockerfiles for frontend and API.
6. Create Compose file using external `torrentnet` network.

## Phase 1: Authentication foundation

Deliverables:

- User registration.
- Login with username or email.
- Logout.
- Current-user endpoint.
- Protected-route middleware.

Tasks:

1. Create `users` table migration.
2. Implement password hashing.
3. Implement session or JWT-cookie auth.
4. Add login and registration rate limiting.
5. Add frontend login and register screens.
6. Add automated tests for username validation and login behavior.

## Phase 2: Simulation profiles

Deliverables:

- Profile CRUD basics.
- Default settings creation.
- No-profile modal gate.
- Active profile selector.

Tasks:

1. Create `simulation_profiles` and `simulation_settings` migrations.
2. Implement profile endpoints.
3. Implement settings endpoints.
4. Build profile selector UI.
5. Build required first-profile modal.
6. Add authorization tests proving users cannot access each other's profiles.

## Phase 3: Calculation engine

Deliverables:

- Pure calculation module.
- Unit tests for all day types and running balances.
- Frontend display helpers for hours and days.

Tasks:

1. Define normalized day model.
2. Implement default weekday and weekend generation.
3. Implement override merge logic.
4. Implement daily accrual and consumption logic.
5. Implement running balance calculations.
6. Test normal, vacation, personal, public holiday, unpaid, and mixed scenarios.

## Phase 4: Calendar interface

Deliverables:

- 12-month selected-year calendar.
- Year navigation.
- Date detail editor.
- Disabled weekends by default.
- Mobile-responsive layout.

Tasks:

1. Validate Wix `react-native-calendars` in the React web stack.
2. If feasible, wrap it with React Native Web dependencies.
3. If not feasible, document the blocker and use a web-native calendar grid that preserves the requested UX.
4. Build month grid cards.
5. Show accrued vacation value below each date.
6. Build selected-date editor.
7. Implement visual markers for day types.

## Phase 5: Range editing and persistence

Deliverables:

- Start-to-end date range selection.
- Bulk settings editor.
- Batch API endpoint.
- Optimistic UI updates.

Tasks:

1. Implement selection state machine.
2. Skip disabled weekends when weekends are off.
3. Add batch day override endpoint.
4. Apply optimistic query-cache updates.
5. Add rollback and toast on save failure.
6. Test range edits across weekdays, weekends, and month boundaries.

## Phase 6: Settings and live recalculation

Deliverables:

- Right-side settings panel.
- Immediate recalculation after accrual-rate and weekend setting changes.
- Left-side balance panel.

Tasks:

1. Build settings form with numeric validation.
2. Persist settings changes.
3. Recalculate year model immediately after changes.
4. Update current and today balances.
5. Confirm weekend enablement changes calendar selection behavior.

## Phase 7: Deployment hardening

Deliverables:

- Production Dockerfiles.
- Compose deployment documentation.
- Reverse proxy notes.
- Security headers and production cookie settings.

Tasks:

1. Add Nginx or static server for frontend.
2. Configure API trust proxy behavior.
3. Add healthcheck endpoints.
4. Add Compose healthchecks.
5. Validate deployment on `torrentnet`.
6. Confirm routing for `vaccal.jjhome.one`.

## Testing strategy

### Unit tests

- Calculation engine.
- Username and email normalization.
- Payload validation schemas.

### Integration tests

- Registration and login.
- Profile ownership enforcement.
- Settings update authorization.
- Day override upsert and batch update.

### Frontend tests

- No-profile modal appears for a user with no profiles.
- Calendar renders 12 months.
- Weekend dates are disabled by default.
- Settings changes update visible balances.

### End-to-end tests

- Register -> create profile -> edit vacation range -> confirm balance changes.
- User A cannot access User B's profile URL.

## Risk register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Wix React Native Calendar may not be ideal for React web | Medium | Run an early spike; use React Native Web if feasible or document and choose a web-native calendar component. |
| Ambiguous day-type combinations | Medium | Implement explicit validation and UI warnings based on calculation rules. |
| Cookie auth behind reverse proxy misconfigured | High | Use `TRUST_PROXY`, HTTPS, secure cookies, and same-domain `/api` routing. |
| Calendar year recalculation performance | Low | Year-sized data is small; memoize normalized days and derived balances. |
| User data leakage through profile IDs | High | Enforce ownership checks in every profile-scoped query and return `404` for unauthorized IDs. |

## Suggested first implementation milestone

The first build milestone should include:

- Working Docker Compose development stack.
- Register/login/logout.
- Profile creation gate.
- A generated 12-month calendar for the active profile.
- Default weekday/weekend calculations.
- Left balance panel and right accrual-rate setting.

This milestone validates the most important architecture and UX assumptions before adding advanced range editing and day-type combinations.
