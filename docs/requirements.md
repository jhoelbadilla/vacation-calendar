# Product Requirements

## Product goal

Build a vacation calculation calendar app that lets each authenticated user create one or more simulation profiles, configure vacation accrual rules, and model vacation, personal, public holiday, unpaid, and normal work days across a year-long calendar.

The app should answer this core question at a glance: **how many vacation hours and equivalent vacation days will the user have accrued by any date, after accounting for planned time off and custom work-day settings?**

## Personas

### Primary user: employee planning time off

- Works a default schedule of 7.5 hours per weekday, 5 days per week.
- Accrues vacation based on hours worked.
- Wants to test multiple scenarios, such as different trip plans or accrual rates.
- Needs fast, visually clear feedback after editing assumptions.

### System owner: local server operator

- Hosts the app on a local Docker server.
- Exposes the frontend at `vaccal.jjhome.one`.
- Uses an existing Docker network named `torrentnet`.
- Needs a maintainable, containerized deployment.

## Functional requirements

### FR-1: Account creation

Users must be able to create an account by providing:

- Username.
- Email address.
- Password.

Username validation:

- Allowed characters: letters, numbers, dash, and underscore.
- Recommended regex: `^[A-Za-z0-9_-]+$`.
- Recommended length: 3 to 32 characters.
- Must be unique case-insensitively.

Email validation:

- Must be syntactically valid.
- Must be unique case-insensitively.

Password validation:

- Minimum recommended length: 12 characters.
- Store only a secure password hash, never the raw password.

### FR-2: Login

Users must be able to log in using either:

- Username + password.
- Email + password.

Successful login should establish a secure authenticated session. Failed login should not reveal whether the username, email, or password was incorrect.

### FR-3: User-specific data isolation

Every simulation profile and day override must belong to exactly one user. A logged-in user must never be able to read, create, update, or delete another user's simulation data.

### FR-4: Simulation profile creation gate

After login, the main app interface loads. If the user has no simulation profile:

- Gray out or blur the main interface shell.
- Show a required modal prompt to create a simulation profile.
- Ask for profile name.
- Ask for optional description.

After creation, that profile becomes active.

### FR-5: Active simulation profile selector

The top of the main interface must show the active simulation profile. Users should be able to switch between profiles when multiple profiles exist. The selected profile drives all configuration, calendar, and balance displays.

### FR-6: Left configuration and balance panel

The left side of the desktop layout must show:

- Current vacation hours.
- Equivalent current vacation days in brackets.
- Effective date for the current vacation balance.
- Accrued vacation time as of today in hours.
- Equivalent accrued vacation days in brackets.

Default day conversion:

- 1 vacation day = 7.5 vacation hours.

### FR-7: Center calendar view

The center of the desktop layout must show a compact calendar grid with all 12 months of the selected year.

Calendar requirements:

- Use Wix `react-native-calendars` if feasible in the React web stack, likely through React Native Web compatibility.
- Show a year control above the 12-month grid.
- Display the accrued vacation hours below each date.
- Use responsive behavior for mobile so months stack or reflow cleanly.

### FR-8: Date detail editor

When the user clicks an enabled date, show how many hours they are working that day.

Defaults:

- Weekday working hours: 7.5.
- Weekend working hours: 0.

The editor must include these day settings:

1. Vacation day toggle.
   - When enabled, ask how many vacation hours are planned.
   - Default vacation hours: 7.5.
   - Vacation hours consume accrued vacation balance.
2. Personal day toggle.
   - Accrues vacation.
   - Does not consume vacation.
3. Public holiday toggle.
   - Accrues vacation.
   - User does not work that day.
4. Unpaid day toggle.
   - Ask how many unpaid hours the user will take.
   - Unpaid hours subtract from working hours, reducing vacation accrued that day.

Multiple toggles may be selected when business rules allow it. Validation should prevent logically impossible or ambiguous combinations, as defined in [Calculation rules](calculation-rules.md).

### FR-9: Date range editing

Users must be able to select multiple days in a start-to-end range, similar to booking a trip. Applying settings to a range updates all eligible dates in that range.

Weekend behavior:

- Weekends are disabled by default.
- Disabled weekends cannot be selected or range-edited.
- The user can enable weekend selection using a simulation setting.

### FR-10: Right simulation settings panel

The right side of the desktop layout must show simulation settings:

- Vacation hours accrued per hour of work.
  - Default: 0.1 hours per hour worked.
- Enable weekends.
  - Default: false.
  - When true, weekends become selectable and editable.

### FR-11: Real-time recalculation

The frontend must refresh calculated information as soon as there is a change in parameters or day settings. The visible calendar, left-panel balances, and selected-date detail should update without requiring a full page refresh.

### FR-12: Dockerized deployment

The final product must run using Docker containers and Docker Compose. The deployment must support:

- Frontend served for `vaccal.jjhome.one`.
- Backend API container.
- Docker-hostable database container.
- Attachment to existing Docker network `torrentnet`.

## Non-functional requirements

### NFR-1: Security

- Hash passwords using Argon2id or bcrypt.
- Use HTTP-only, secure cookies in production.
- Protect every API route that accesses user data.
- Use CSRF protection if cookie-based sessions are used.
- Rate-limit login and registration routes.
- Validate and sanitize all inputs.

### NFR-2: Performance

- Initial year calendar should load quickly for a normal user profile.
- Recalculations should feel immediate for year-sized data.
- Computed balances can be calculated client-side from normalized profile data and persisted overrides, while the backend remains the source of truth.

### NFR-3: Maintainability

- Use TypeScript on frontend and backend.
- Keep calculation logic in a shared or well-tested module.
- Document business rules and schema decisions.
- Add automated tests for authentication, profile ownership, and accrual calculations.

### NFR-4: Accessibility

- Use accessible shadcn/ui primitives.
- Calendar interactions must be keyboard navigable where possible.
- Toggles and numeric fields must have labels and validation messages.
- Color should not be the only indicator of vacation, holiday, or unpaid states.

## Acceptance criteria

- A new user can register and log in with username or email.
- A logged-in user with no profiles is forced through profile creation before editing calendar data.
- A profile shows the selected year with all 12 months.
- Weekday dates show default 7.5 working hours and accrue vacation at the configured rate.
- Weekend dates are disabled until weekend selection is enabled.
- Editing a vacation day immediately changes consumed balance and visible accrued values.
- Editing an unpaid day immediately reduces accrual for that day.
- A second user cannot access the first user's profiles by guessing IDs or API URLs.
- `docker compose up -d` can start the app stack after environment variables are configured.
