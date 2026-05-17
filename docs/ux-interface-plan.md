# UX and Interface Plan

## Visual direction

The application should look modern, calm, and data-rich without feeling crowded. Recommended style characteristics:

- Dark-friendly neutral palette with high-contrast cards.
- shadcn/ui components for dialogs, forms, buttons, popovers, sheets, cards, and toggles.
- Tailwind CSS utility classes with design tokens for spacing, borders, shadows, and semantic colors.
- Subtle glass or layered card effect for the three-column simulation workspace.
- Clear status colors for vacation, personal, holiday, and unpaid days.

## App routes

| Route | Purpose |
| --- | --- |
| `/login` | Login form with username/email identifier and password. |
| `/register` | Account creation form. |
| `/app` | Authenticated simulation workspace. |
| `/app/profile/:profileId?year=YYYY` | Optional deep link to a profile and year. |

## Authentication screens

### Register screen fields

- Username.
- Email.
- Password.
- Submit button.
- Link to login.

Username helper text should explain that only letters, numbers, dash, and underscore are allowed.

### Login screen fields

- Username or email.
- Password.
- Submit button.
- Link to create account.

## Main workspace layout

Desktop layout:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top bar: app name | active simulation profile | user menu          │
├───────────────┬───────────────────────────────────────┬────────────┤
│ Left panel    │ Center calendar                       │ Right panel│
│ balances      │ 12-month compact grid + year control  │ settings   │
│               │ selected date/range editor            │            │
└───────────────┴───────────────────────────────────────┴────────────┘
```

Mobile layout:

```text
┌──────────────────────┐
│ Top bar              │
├──────────────────────┤
│ Profile selector     │
├──────────────────────┤
│ Balance summary      │
├──────────────────────┤
│ Settings accordion   │
├──────────────────────┤
│ Year control         │
├──────────────────────┤
│ Month cards stacked  │
├──────────────────────┤
│ Bottom sheet editor  │
└──────────────────────┘
```

## No-profile gate

If a logged-in user has no simulation profiles:

- Render the app workspace in the background as a disabled preview.
- Apply grayscale, blur, or opacity overlay.
- Open a modal dialog titled `Create your first simulation profile`.
- Fields:
  - Profile name.
  - Optional description.
- Do not allow dismissal until a profile is created or the user logs out.

## Top bar

Top bar content:

- App name: `Vacation Calendar`.
- Active simulation profile selector.
- Create new profile action.
- User menu with logout.

## Left panel: balances

Display cards:

1. Current vacation balance.
   - Example: `37.50 hours (5.00 days)`.
   - Subtitle: `As of May 17, 2026`.
2. Accrued vacation as of today.
   - Example: `42.75 hours (5.70 days)`.
   - Subtitle: `Includes configured accrual and calendar overrides`.
3. Optional projection summary.
   - End-of-year projected balance.
   - Planned vacation consumption for selected year.

## Center calendar

### Year control

Controls:

- Previous year button.
- Current selected year label.
- Next year button.
- Optional `Today` shortcut.

### Month grid

Desktop:

- 3 or 4 columns depending on available width.
- Each month is a compact card.

Tablet:

- 2 columns.

Mobile:

- 1 column.

Each day cell should show:

- Day number.
- Accrued vacation or running balance value below the date, depending on final wording.
- Visual indicator for configured type:
  - Vacation: accent fill or suitcase icon.
  - Personal: soft blue.
  - Public holiday: soft purple or flag icon.
  - Unpaid: warning amber.
  - Disabled weekend: muted text and no pointer interaction.

The requirement says to show accrued vacation hours below each date. During implementation, decide whether this means daily accrued amount or running accrued balance by that date. Recommended UX: show running projected balance because it is more useful, and show daily accrued amount in the date detail panel.

## Date and range interaction

### Single-date selection

Clicking an enabled date opens a side panel or popover on desktop and a bottom sheet on mobile.

Editor fields:

- Date heading.
- Working hours display or editable field.
- Vacation day toggle.
- Vacation hours field, shown when vacation toggle is enabled.
- Personal day toggle.
- Public holiday toggle.
- Unpaid day toggle.
- Unpaid hours field, shown when unpaid toggle is enabled.
- Reset to default button.

### Range selection

Range selection behavior:

- First click selects start date.
- Hover previews range on desktop.
- Second click selects end date.
- Mobile can use a `Select range` mode with start and end taps.
- After range selection, open bulk editor.
- Disabled weekends are skipped when weekends are not enabled.

## Right panel: simulation settings

Fields:

- Vacation hours accrued per hour worked.
  - Numeric input.
  - Default value: `0.1`.
- Enable weekends.
  - Switch input.
  - Helper text: `Allows Saturdays and Sundays to be selected and configured.`

Future-friendly settings:

- Standard workday hours.
- Current vacation balance.
- Current vacation balance effective date.

## Real-time feedback

Every settings or day edit should immediately update:

- Selected day details.
- Calendar day values.
- Left balance cards.
- End-of-year projection if displayed.

Use optimistic UI and inline saving state:

- `Saving...` indicator for active mutation.
- Toast on save failure.
- Rollback to previous values on failure.
