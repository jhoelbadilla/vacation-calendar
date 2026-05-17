# API Design

## API principles

- Prefix all endpoints with `/api`.
- Use JSON request and response bodies.
- Authenticate protected routes using an HTTP-only session or JWT cookie.
- Validate request bodies with shared schemas.
- Return `404` for missing or unauthorized profile-scoped resources to avoid information disclosure.
- Derive user identity only from the authenticated session.

## Auth endpoints

### `POST /api/auth/register`

Creates a new user and starts a session.

Request:

```json
{
  "username": "my_user-1",
  "email": "user@example.com",
  "password": "long secure password"
}
```

Validation:

- `username`: `^[A-Za-z0-9_-]+$`, 3 to 32 characters.
- `email`: valid email format.
- `password`: minimum length, recommended 12 characters.

Response `201`:

```json
{
  "user": {
    "id": "uuid",
    "username": "my_user-1",
    "email": "user@example.com"
  }
}
```

### `POST /api/auth/login`

Logs in with username or email plus password.

Request:

```json
{
  "identifier": "my_user-1",
  "password": "long secure password"
}
```

Response `200`:

```json
{
  "user": {
    "id": "uuid",
    "username": "my_user-1",
    "email": "user@example.com"
  }
}
```

### `POST /api/auth/logout`

Clears the session cookie.

Response `204`: no body.

### `GET /api/me`

Returns the authenticated user.

Response `200`:

```json
{
  "user": {
    "id": "uuid",
    "username": "my_user-1",
    "email": "user@example.com"
  }
}
```

## Profile endpoints

### `GET /api/profiles`

Returns all profiles owned by the authenticated user.

Response `200`:

```json
{
  "profiles": [
    {
      "id": "uuid",
      "name": "Default plan",
      "description": "Base vacation scenario",
      "createdAt": "2026-05-17T00:00:00.000Z",
      "updatedAt": "2026-05-17T00:00:00.000Z"
    }
  ]
}
```

### `POST /api/profiles`

Creates a profile and default settings.

Request:

```json
{
  "name": "Default plan",
  "description": "Base vacation scenario"
}
```

Response `201`:

```json
{
  "profile": {
    "id": "uuid",
    "name": "Default plan",
    "description": "Base vacation scenario"
  },
  "settings": {
    "currentVacationHours": 0,
    "currentVacationAsOfDate": "2026-05-17",
    "standardWorkdayHours": 7.5,
    "vacationHoursPerWorkHour": 0.1,
    "weekendsEnabled": false
  }
}
```

### `PATCH /api/profiles/:profileId`

Updates profile metadata.

Request:

```json
{
  "name": "Updated name",
  "description": "Updated description"
}
```

Response `200`: updated profile.

### `DELETE /api/profiles/:profileId`

Archives or deletes a profile owned by the authenticated user.

Recommended first version: soft archive with `is_archived = true`.

Response `204`: no body.

## Settings endpoints

### `GET /api/profiles/:profileId/settings`

Returns settings for a user-owned profile.

Response `200`:

```json
{
  "settings": {
    "currentVacationHours": 37.5,
    "currentVacationAsOfDate": "2026-05-17",
    "standardWorkdayHours": 7.5,
    "vacationHoursPerWorkHour": 0.1,
    "weekendsEnabled": false
  }
}
```

### `PATCH /api/profiles/:profileId/settings`

Updates calculation settings.

Request:

```json
{
  "currentVacationHours": 37.5,
  "currentVacationAsOfDate": "2026-05-17",
  "vacationHoursPerWorkHour": 0.1,
  "weekendsEnabled": true
}
```

Response `200`: updated settings.

## Calendar endpoints

### `GET /api/profiles/:profileId/year/:year`

Returns settings and sparse day overrides for a full calendar year.

Response `200`:

```json
{
  "profile": {
    "id": "uuid",
    "name": "Default plan"
  },
  "settings": {
    "currentVacationHours": 37.5,
    "currentVacationAsOfDate": "2026-05-17",
    "standardWorkdayHours": 7.5,
    "vacationHoursPerWorkHour": 0.1,
    "weekendsEnabled": false
  },
  "overrides": [
    {
      "date": "2026-07-03",
      "workHours": 0,
      "vacationDay": true,
      "vacationHours": 7.5,
      "personalDay": false,
      "publicHoliday": false,
      "unpaidDay": false,
      "unpaidHours": 0
    }
  ]
}
```

### `PUT /api/profiles/:profileId/day-overrides/:date`

Upserts a single date override.

Request:

```json
{
  "workHours": 0,
  "vacationDay": true,
  "vacationHours": 7.5,
  "personalDay": false,
  "publicHoliday": false,
  "unpaidDay": false,
  "unpaidHours": 0
}
```

Response `200`: updated override.

### `DELETE /api/profiles/:profileId/day-overrides/:date`

Removes an override so the date returns to generated defaults.

Response `204`: no body.

### `PATCH /api/profiles/:profileId/day-overrides:batch`

Applies a day-setting patch to multiple dates or an inclusive range.

Request by explicit dates:

```json
{
  "dates": ["2026-07-01", "2026-07-02", "2026-07-03"],
  "patch": {
    "vacationDay": true,
    "vacationHours": 7.5
  }
}
```

Request by range:

```json
{
  "range": {
    "start": "2026-07-01",
    "end": "2026-07-10"
  },
  "skipDisabledWeekends": true,
  "patch": {
    "vacationDay": true,
    "vacationHours": 7.5
  }
}
```

Response `200`:

```json
{
  "updated": 8,
  "overrides": []
}
```

## Error response format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "fields": {
      "username": "Only letters, numbers, dash, and underscore are allowed."
    }
  }
}
```

## Recommended status codes

| Condition | Status |
| --- | ---: |
| Validation error | `400` |
| Unauthenticated | `401` |
| Authenticated but not allowed for non-profile global action | `403` |
| Profile missing or not owned by user | `404` |
| Duplicate username/email | `409` |
| Successful creation | `201` |
| Successful deletion/logout | `204` |
