# FixPoint API Documentation

This document covers every endpoint in the FixPoint REST API. The Postman collection in the repository root mirrors this documentation exactly and can be imported directly for testing.

Base URL (local): `http://127.0.0.1:5000`  
Base URL (production): configured per deployment on Railway

---

## Contents

1. Authentication
2. Error Handling
3. Endpoints
   - Health
   - Auth
   - Complaints
   - Housekeeping
   - Slots
   - Notifications
   - Escalations
4. Role Permission Matrix
5. Complaint Status Reference
6. Testing with Postman

---

## Authentication

The API uses JWT (JSON Web Token) authentication with the HS256 signing algorithm. Tokens are issued on login and registration, carry a 7-day expiry, and encode the user ID and role.

Every protected endpoint requires the token in the request header:

```
Authorization: Bearer <token>
```

Tokens are stateless. The server does not maintain session state, which means the API works correctly across multiple server instances and serverless environments. Role-based access control is enforced server-side on every request by decoding the token and checking the role claim.

The only endpoints that do not require a token are:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/escalations/sweep` (uses a separate `X-Cron-Secret` header)

---

## Error Handling

All error responses follow a consistent format:

```json
{
  "error": "Human-readable description of what went wrong"
}
```

The API uses standard HTTP status codes throughout. The table below covers the codes you will encounter.

| Code | Meaning |
|---|---|
| 200 | Request succeeded |
| 201 | Resource created successfully |
| 400 | Request body is missing required fields or contains invalid values |
| 401 | Token is missing, expired, or invalid |
| 403 | Token is valid but the user's role does not have permission for this action |
| 404 | The requested resource does not exist |
| 409 | Conflict, for example attempting to register with an email that already exists or booking a full slot |
| 500 | Unexpected server error |

---

## Endpoints

### Health

#### GET /api/health

Verifies the server is running. No authentication required. Useful as a connectivity check before debugging other issues.

**Response 200**

```json
{
  "status": "ok"
}
```

---

### Auth

#### POST /api/auth/register

Creates a new user account and returns a JWT token. The token is immediately usable for authenticated requests.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| full_name | string | Yes | |
| email | string | Yes | Must be unique across all users |
| password | string | Yes | Minimum 8 characters. Stored as a bcrypt hash |
| role | string | Yes | One of: student, staff, housekeeping, caretaker |
| roll_number | string | No | Students only |
| hostel_name | string | No | Students only |
| room_number | string | No | Students only |
| floor | string | No | Students only |
| department | string | No | Staff and housekeeping |
| phone_number | string | No | Staff and housekeeping |

**Example request**

```json
{
  "full_name": "Keshav Swami",
  "email": "keshav@iitj.ac.in",
  "password": "securepassword",
  "role": "student",
  "roll_number": "B21CS001",
  "hostel_name": "BH1",
  "room_number": "101"
}
```

**Response 201**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "student",
  "name": "Keshav Swami",
  "email": "keshav@iitj.ac.in"
}
```

**Response 409** — email already registered

```json
{
  "error": "An account with this email already exists"
}
```

---

#### POST /api/auth/login

Authenticates an existing user. Returns a JWT token on success.

**Example request**

```json
{
  "email": "keshav@iitj.ac.in",
  "password": "securepassword"
}
```

**Response 200**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "student",
  "name": "Keshav Swami",
  "email": "keshav@iitj.ac.in",
  "hostel_name": "BH1",
  "room_number": "101"
}
```

**Response 401** — wrong credentials

```json
{
  "error": "Invalid email or password"
}
```

---

#### GET /api/auth/me

Returns the full profile of the currently authenticated user. Used by the frontend on application load to restore session state.

**Response 200**

```json
{
  "id": 1,
  "full_name": "Keshav Swami",
  "email": "keshav@iitj.ac.in",
  "role": "student",
  "hostel_name": "BH1",
  "room_number": "101",
  "floor": null,
  "department": null,
  "phone_number": null
}
```

---

### Complaints

#### POST /api/complaints

Creates a new complaint. Restricted to students.

The `student_email` is taken from the JWT token, not the request body. On creation, a notification is sent to all caretaker accounts.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| category | string | Yes | Electrical, Plumbing, Civil, Carpentry, Network, Other |
| issue | string | Yes | Max 255 characters |
| details | string | No | Extended description |
| priority | string | No | normal or urgent. Defaults to normal |

**Example request**

```json
{
  "category": "Electrical",
  "issue": "Fan not working in room",
  "details": "The ceiling fan has not been working for two days.",
  "priority": "urgent"
}
```

**Response 201**

```json
{
  "complaint_id": 1
}
```

---

#### GET /api/complaints

Returns complaints filtered by the authenticated user's role.

Students receive their own complaints only. Staff receive complaints where `category` matches their `department` field. Caretakers receive all complaints.

**Response 200**

```json
[
  {
    "complaint_id": 1,
    "student_email": "keshav@iitj.ac.in",
    "category": "Electrical",
    "issue": "Fan not working in room",
    "details": "The ceiling fan has not been working for two days.",
    "priority": "urgent",
    "status": "Pending",
    "created_at": "2026-05-31T10:00:00"
  }
]
```

---

#### PATCH /api/complaints/:id/status

Updates the status of a complaint. Restricted to staff and caretakers. Every call writes a row to `resolution_logs` and notifies the student.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| status | string | Yes | In Progress, Pending Confirmation, Resolved, Escalated |
| notes | string | No | Optional context for the log entry |

**Response 200**

```json
{
  "ok": true
}
```

---

#### PATCH /api/complaints/:id/confirm

Allows a student to confirm or dispute a resolution. Only the student who originally raised the complaint can call this endpoint, enforced by comparing the JWT email against the `student_email` field on the complaint.

Setting `action` to `dispute` creates an entry in `escalation_logs` and moves the complaint to Disputed status for caretaker review.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| action | string | Yes | confirm or dispute |

**Response 200**

```json
{
  "ok": true
}
```

---

#### PATCH /api/complaints/:id/force-resolve

Forcefully resolves a complaint regardless of its current status. Restricted to caretakers. Intended for escalated or disputed complaints requiring administrative closure.

No request body required.

**Response 200**

```json
{
  "ok": true
}
```

---

### Housekeeping

#### POST /api/housekeeping

Creates a housekeeping request. Restricted to students. The student's hostel, room, and floor are attached automatically from their profile.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| task | string | Yes | Bed linen change, Floor sweep, Washroom cleaning, Garbage collection, Window cleaning, Dusting |
| notes | string | No | Special instructions |

**Response 201**

```json
{
  "request_id": 1
}
```

---

#### GET /api/housekeeping

Returns housekeeping requests. Students see only their own. Housekeeping staff and caretakers see all requests.

**Response 200**

```json
[
  {
    "request_id": 1,
    "student_email": "keshav@iitj.ac.in",
    "hostel_name": "BH1",
    "room_number": "101",
    "task": "Floor sweep",
    "notes": "Please clean under the bed as well.",
    "status": "Pending",
    "created_at": "2026-05-31T11:00:00"
  }
]
```

---

#### PATCH /api/housekeeping/:id/status

Updates housekeeping request status. Restricted to housekeeping staff and caretakers.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| status | string | Yes | In Progress or Completed |

**Response 200**

```json
{
  "ok": true
}
```

---

### Slots

#### POST /api/slots

Creates a visit slot. Restricted to staff. The `staff_id` is derived from the JWT token.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| visit_date | string | Yes | Format: YYYY-MM-DD |
| slot_time | string | Yes | Free text, e.g. 10:00 AM - 11:00 AM |
| hostel_name | string | Yes | |
| max_capacity | integer | No | Defaults to 8 |

**Response 201**

```json
{
  "slot_id": 1
}
```

---

#### GET /api/slots

Returns all upcoming slots where `visit_date >= today`, joined with the staff member's full name. Available to all authenticated roles.

**Response 200**

```json
[
  {
    "slot_id": 1,
    "staff_id": 2,
    "staff_name": "Ramesh Kumar",
    "visit_date": "2026-06-10",
    "slot_time": "10:00 AM - 11:00 AM",
    "hostel_name": "BH1",
    "max_capacity": 8,
    "current_bookings": 3,
    "status": "available",
    "created_at": "2026-06-01T09:00:00"
  }
]
```

---

#### POST /api/slots/:id/book

Books a slot for a specific complaint. Restricted to students.

A `SELECT ... FOR UPDATE` row-level lock prevents race conditions when two students book the same slot concurrently. The slot status is set to `full` automatically when `current_bookings` reaches `max_capacity`.

**Request body**

| Field | Type | Required |
|---|---|---|
| complaint_id | integer | Yes |

**Response 201**

```json
{
  "ok": true
}
```

**Response 409** — slot is full

```json
{
  "error": "This slot is full"
}
```

---

### Notifications

#### GET /api/notifications

Returns the 50 most recent notifications for the authenticated user. Unread notifications have `is_read: 0`. The frontend polls this endpoint every 30 seconds.

Notifications are created automatically when complaints are raised, when complaint status changes, and when slots are fully booked.

**Response 200**

```json
[
  {
    "id": 1,
    "recipient_id": 1,
    "complaint_id": 1,
    "message": "Your complaint #1 has been updated to: In Progress",
    "is_read": 0,
    "created_at": "2026-05-31T12:00:00"
  }
]
```

---

#### PATCH /api/notifications/read-all

Sets `is_read` to 1 for every notification belonging to the authenticated user. Called automatically when the notification panel is opened.

**Response 200**

```json
{
  "ok": true
}
```

---

### Escalations

#### GET /api/escalations

Returns all escalation log entries joined with complaint details. Restricted to caretakers.

Escalations are created by two events: the background engine after 72 hours of inactivity (reason: `Auto: 72h no action`) and student disputes (reason: `Disputed by student`).

**Response 200**

```json
[
  {
    "id": 1,
    "complaint_id": 1,
    "reason": "Auto: 72h no action",
    "escalated_at": "2026-06-03T10:00:00",
    "issue": "Fan not working in room",
    "category": "Electrical",
    "status": "Escalated",
    "student_email": "keshav@iitj.ac.in"
  }
]
```

---

#### POST /api/escalations/sweep

Triggers the escalation sweep manually. In production this is called by a Railway Cron Job scheduled at `0 * * * *`.

This endpoint is not JWT-protected. It uses a separate `X-Cron-Secret` header to prevent unauthorised calls. The value must match the `CRON_SECRET` environment variable on the server.

**Request header**

```
X-Cron-Secret: your-cron-secret-value
```

**Response 200**

```json
{
  "escalated": 2
}
```

---

## Role Permission Matrix

| Endpoint | Student | Staff | Housekeeping | Caretaker |
|---|---|---|---|---|
| POST /api/complaints | Yes | No | No | No |
| GET /api/complaints | Own only | Department only | No | All |
| PATCH /api/complaints/:id/status | No | Yes | No | Yes |
| PATCH /api/complaints/:id/confirm | Own only | No | No | No |
| PATCH /api/complaints/:id/force-resolve | No | No | No | Yes |
| POST /api/housekeeping | Yes | No | No | No |
| GET /api/housekeeping | Own only | No | All | All |
| PATCH /api/housekeeping/:id/status | No | No | Yes | Yes |
| POST /api/slots | No | Yes | No | No |
| GET /api/slots | Yes | Yes | Yes | Yes |
| POST /api/slots/:id/book | Yes | No | No | No |
| GET /api/notifications | Yes | Yes | Yes | Yes |
| GET /api/escalations | No | No | No | Yes |
| POST /api/escalations/sweep | Cron only | Cron only | Cron only | Cron only |

---

## Complaint Status Reference

```
Pending
  The complaint has been submitted. No staff action yet.

In Progress
  A staff member has acknowledged the complaint and work has begun.

Pending Confirmation
  Staff has marked the work as done. The student has been notified
  and must confirm or dispute the resolution.

Resolved
  The student confirmed the fix, or a caretaker force-resolved the complaint.

Disputed
  The student rejected the resolution. The complaint appears in the
  caretaker's escalation view.

Escalated
  The complaint was automatically escalated by the engine after 72 hours
  without a status update, or was manually escalated by a caretaker.
```

---

## Testing with Postman

**Import the collection**

Open Postman, click Import, and select `FixPoint.postman_collection.json` from the repository root.

**Set up the environment**

The collection uses two variables: `base_url` and `token`. Both are defined at the collection level. Change `base_url` to your production Railway URL when testing against the deployed backend.

**Authenticate first**

Run either the Register or Login request. Both include a test script that automatically saves the returned token to the `token` collection variable. All subsequent requests use this variable in their Authorization header, so you do not need to copy-paste the token manually.

**Suggested test order**

1. Health Check — confirm the server is reachable
2. Register — create a student account (token saved automatically)
3. Create Complaint — raise a complaint as the student
4. Get Complaints — verify the complaint appears
5. Register a second time with role `staff` and department `Electrical`
6. Login as the staff account (token updated automatically)
7. Get Complaints — verify the staff sees the Electrical complaint
8. Update Complaint Status to `In Progress`
9. Login back as the student
10. Get Complaints — verify the status shows In Progress
11. Update status to `Pending Confirmation` as staff
12. Confirm Resolution as the student
13. Get Complaints — verify the complaint shows Resolved
