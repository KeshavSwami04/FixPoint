# FixPoint

A full stack grievance and maintenance management platform designed for institutional environments.

FixPoint digitizes the complete lifecycle of hostel maintenance requests, replacing informal complaint channels with a structured workflow that improves accountability, transparency, and operational visibility across students, maintenance staff, housekeeping teams, and caretakers.

The platform enables complaints to be tracked from submission through resolution while maintaining a verifiable audit trail of every action performed. It combines complaint management, maintenance scheduling, notifications, dispute handling, and automated escalation into a single system.

## Problem Statement

Hostel maintenance complaints are often managed through paper registers, messaging groups, or verbal communication. Such processes provide limited visibility into complaint status, make accountability difficult to enforce, and offer no reliable mechanism for measuring response times or service quality.

As a result:

* Students cannot reliably track reported issues.
* Staff workloads remain difficult to manage and monitor.
* Caretakers lack visibility into unresolved or recurring problems.
* Institutions have limited operational data for decision making.

FixPoint addresses these challenges through a structured workflow with clearly defined ownership, controlled state transitions, escalation policies, and complete complaint traceability.

---

## System Architecture

```text
┌─────────────────────────────────────────────┐
│                  Frontend                   │
│         React • Vite • Tailwind CSS         │
└─────────────────────┬───────────────────────┘
                      │
                      │ REST API
                      ▼
┌─────────────────────────────────────────────┐
│                  Backend                    │
│                   Flask                     │
│                                             │
│ Authentication • Authorization              │
│ Complaint Management                        │
│ Scheduling                                  │
│ Notifications                               │
│ Escalation Engine                           │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│                  Database                   │
│                   MySQL                     │
│                                             │
│ Users • Complaints • Bookings               │
│ Notifications • Escalations • Logs          │
└─────────────────────────────────────────────┘
```

---

## Complaint Lifecycle

```text
                    ┌─────────────┐
                    │   Pending   │
                    └──────┬──────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │  In Progress    │
                 └────────┬────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Pending Confirmation    │
              └───────┬─────────┬───────┘
                      │         │
            Confirmed │         │ Disputed
                      │         │
                      ▼         ▼
              ┌──────────┐  ┌───────────┐
              │ Resolved │  │ Escalated │
              └──────────┘  └─────┬─────┘
                                  │
                                  ▼
                         ┌────────────────┐
                         │ Caretaker      │
                         │ Review         │
                         └────────────────┘
```

Students must explicitly verify completed work before a complaint is resolved. Disputed complaints are escalated for caretaker review, ensuring accountability throughout the workflow.

---

## Key Features

### Role Based Access Control

Supports dedicated workflows and dashboards for:

* Students
* Maintenance Staff
* Housekeeping Staff
* Caretakers

Access restrictions are enforced at the API layer using JWT based authorization.

### Complaint Management

* Complaint creation and tracking
* Category and priority based classification
* Workflow driven status transitions
* Resolution verification by students
* Dispute handling and escalation

### Automated Escalation

A background escalation service periodically scans unresolved complaints and automatically flags cases that remain unattended beyond configured thresholds.

### Maintenance Scheduling

* Staff controlled availability slots
* Student booking workflow
* Conflict prevention during booking

### Notifications and Audit Trail

The system maintains a complete history of complaint activity, resolution updates, and escalation events to support accountability and operational transparency.

---

## Technology Stack

### Frontend

* React
* Vite
* Tailwind CSS
* React Router
* Context API

### Backend

* Flask
* PyJWT
* bcrypt
* Flask CORS
* MySQL Connector

### Database

* MySQL

### Infrastructure

* Docker
* Docker Compose
* Nginx
* Railway Deployment Configuration
* Vercel Deployment Configuration

---

## API Documentation & Testing

The backend exposes REST APIs for authentication, complaint management, scheduling, notifications, escalation handling, and role-based workflows.

### API Coverage

The API surface includes:

* User authentication and authorization
* Complaint creation and lifecycle management
* Complaint assignment and status updates
* Student resolution verification
* Escalation and dispute handling
* Maintenance slot management
* Booking workflows
* Notification management

### Authentication

All protected endpoints use JWT-based authentication.

Role-based access control is enforced at the API layer to ensure that students, staff members, housekeeping personnel, and caretakers can only access actions permitted by their responsibilities.

### API Testing

Endpoints were validated using Postman collections during development to verify:

* Authentication flows
* Request validation
* Permission enforcement
* Workflow transitions
* Error handling scenarios

### Documentation

Detailed endpoint specifications, request schemas, response formats, and authorization requirements are available in:

* [API Documentation](./API.md)
* Postman Collection (`FixPoint.postman_collection.json`)



## Database Overview

Core entities include:

* Users
* Complaints
* Resolution Logs
* Escalation Logs
* Notifications
* Slots
* Bookings
* Housekeeping Requests

The schema is designed around relational integrity and workflow traceability, enabling complaint history, escalation tracking, scheduling, and notification management through a unified data model.

---

## Engineering Decisions

### JWT Authentication

Authentication is implemented using stateless JWT tokens rather than server side sessions. This simplifies deployment and allows the application to scale across multiple instances without session synchronization.

### MySQL for Relational Workflows

The platform manages highly interconnected entities including complaints, notifications, bookings, escalations, and audit logs. MySQL provides transactional guarantees and efficient relational querying for these workflows.

### Resolution Verification

Complaints cannot be directly closed by staff members. Once work is marked complete, the complaint enters a verification stage where the student confirms the resolution. This prevents complaints from being silently closed without user acknowledgement.

### Escalation Logging

Escalations are stored as first class records rather than status updates alone, creating an auditable history of system generated actions and operational exceptions.

---

## Project Structure

```text
FixPoint/
├── backend/
│   ├── app.py
│   ├── escalation.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── utils/
│   ├── nginx.conf
│   └── Dockerfile
│
├── db/
│   └── init.sql
│
├── docker-compose.yml
├── railway.toml
├── DEPLOY.md
└── .env.example
```

---

## Local Setup

### Prerequisites

* Python 3.11+
* Node.js 18+
* MySQL 8+

### Clone Repository

```bash
git clone https://github.com/KeshavSwami04/FixPoint.git
cd FixPoint
```

### Configure Environment

Create a `.env` file and configure:

```env
SECRET_KEY=your-secret-key
CRON_SECRET=your-cron-secret

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=instifix_db

FRONTEND_URL=http://localhost:5173
```

### Initialize Database

```sql
CREATE DATABASE instifix_db;
USE instifix_db;
SOURCE db/init.sql;
```

### Run Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Future Improvements

* Real time notifications using WebSockets
* Operational analytics dashboard for complaint trends and resolution metrics
* SLA based escalation policies with configurable response deadlines
* Image attachments for complaints and dispute verification
* Multi hostel and multi campus support
* Mobile application for students and maintenance staff

---

## Author

**Keshav Swami**
B.Tech, Electrical Engineering
Indian Institute of Technology Jodhpur

GitHub: https://github.com/KeshavSwami04
