import os
import jwt
import bcrypt
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import pooling
from escalation import start_escalation_engine, run_sweep

load_dotenv()
app = Flask(__name__)

SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")
CRON_SECRET = os.environ.get("CRON_SECRET", "change-cron-secret")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost")

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME", "instifix_db"),
}

CORS(app, origins=[FRONTEND_URL], supports_credentials=False)

pool = pooling.MySQLConnectionPool(pool_name="fixpoint", pool_size=2, **DB_CONFIG)


def get_db():
    return pool.get_connection()


# ── JWT helpers ───────────────────────────────────────────────────────────────

def make_token(user_id, role):
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def require_auth(roles=None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid token"}), 401
            token = header[7:]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired — please log in again"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401
            if roles and payload["role"] not in roles:
                return jsonify({"error": "You don't have permission to do that"}), 403
            request.user_id = payload["sub"]
            request.user_role = payload["role"]
            return f(*args, **kwargs)
        return wrapper
    return decorator


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    required = ["full_name", "email", "password", "role"]
    missing = [f for f in required if not str(data.get(f, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    role = data["role"]
    if role not in ("student", "staff", "housekeeping", "caretaker"):
        return jsonify({"error": "Invalid role"}), 400

    password = data["password"]
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    email = data["email"].strip().lower()
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """INSERT INTO users
               (full_name, email, password, role,
                roll_number, hostel_name, room_number, floor,
                staff_id, department, phone_number)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                data["full_name"].strip(), email, password_hash, role,
                data.get("roll_number"), data.get("hostel_name"),
                data.get("room_number"), data.get("floor"),
                data.get("staff_id"), data.get("department"), data.get("phone_number"),
            ),
        )
        conn.commit()
        user_id = cur.lastrowid
        token = make_token(user_id, role)
        return jsonify({
            "token": token,
            "role": role,
            "name": data["full_name"].strip(),
            "email": email,
        }), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": "An account with this email already exists"}), 409
    finally:
        cur.close(); conn.close()


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email") or "").strip().lower()
    password = str(data.get("password") or "")
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        if not user or not bcrypt.checkpw(password.encode(), user["password"].encode()):
            return jsonify({"error": "Invalid email or password"}), 401
        token = make_token(user["id"], user["role"])
        return jsonify({
            "token": token,
            "role": user["role"],
            "name": user["full_name"],
            "email": user["email"],
            "hostel_name": user.get("hostel_name"),
            "room_number": user.get("room_number"),
        })
    finally:
        cur.close(); conn.close()


@app.route("/api/auth/me", methods=["GET"])
@require_auth()
def me():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """SELECT id, full_name, email, role, hostel_name,
               room_number, floor, department, phone_number
               FROM users WHERE id = %s""",
            (request.user_id,),
        )
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user)
    finally:
        cur.close(); conn.close()


# ── Complaints ────────────────────────────────────────────────────────────────

@app.route("/api/complaints", methods=["POST"])
@require_auth(["student"])
def create_complaint():
    data = request.get_json(silent=True) or {}
    category = str(data.get("category") or "").strip()
    issue = str(data.get("issue") or "").strip()
    if not category:
        return jsonify({"error": "Category is required"}), 400
    if not issue:
        return jsonify({"error": "Issue description is required"}), 400
    if len(issue) > 255:
        return jsonify({"error": "Issue description is too long (max 255 chars)"}), 400

    priority = data.get("priority", "normal")
    if priority not in ("normal", "urgent"):
        priority = "normal"

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT email FROM users WHERE id = %s", (request.user_id,))
        user = cur.fetchone()
        cur.execute(
            "INSERT INTO complaints (student_email, category, issue, details, priority) VALUES (%s,%s,%s,%s,%s)",
            (user["email"], category, issue, str(data.get("details") or ""), priority),
        )
        conn.commit()
        cid = cur.lastrowid
        cur.execute("SELECT id FROM users WHERE role = 'caretaker'")
        for c in cur.fetchall():
            cur.execute(
                "INSERT INTO notifications (recipient_id, complaint_id, message) VALUES (%s,%s,%s)",
                (c["id"], cid, f"New complaint #{cid}: {issue}"),
            )
        conn.commit()
        return jsonify({"complaint_id": cid}), 201
    finally:
        cur.close(); conn.close()


@app.route("/api/complaints", methods=["GET"])
@require_auth()
def get_complaints():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        role = request.user_role
        if role == "student":
            cur.execute("SELECT email FROM users WHERE id = %s", (request.user_id,))
            user = cur.fetchone()
            cur.execute(
                "SELECT * FROM complaints WHERE student_email = %s ORDER BY created_at DESC",
                (user["email"],),
            )
        elif role == "staff":
            cur.execute("SELECT department FROM users WHERE id = %s", (request.user_id,))
            user = cur.fetchone()
            cur.execute(
                "SELECT * FROM complaints WHERE category = %s ORDER BY created_at DESC",
                (user["department"],),
            )
        else:
            cur.execute("SELECT * FROM complaints ORDER BY created_at DESC")
        rows = cur.fetchall()
        for r in rows:
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


@app.route("/api/complaints/<int:cid>/status", methods=["PATCH"])
@require_auth(["staff", "caretaker"])
def update_complaint_status(cid):
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status") or "").strip()
    valid = ["In Progress", "Pending Confirmation", "Resolved", "Escalated"]
    if new_status not in valid:
        return jsonify({"error": f"Status must be one of: {', '.join(valid)}"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM complaints WHERE complaint_id = %s", (cid,))
        complaint = cur.fetchone()
        if not complaint:
            return jsonify({"error": "Complaint not found"}), 404

        cur.execute("UPDATE complaints SET status = %s WHERE complaint_id = %s", (new_status, cid))
        cur.execute(
            "INSERT INTO resolution_logs (complaint_id, action, actor_role, notes) VALUES (%s,%s,%s,%s)",
            (cid, new_status, request.user_role, str(data.get("notes") or "")),
        )
        cur.execute("SELECT id FROM users WHERE email = %s", (complaint["student_email"],))
        student = cur.fetchone()
        if student:
            cur.execute(
                "INSERT INTO notifications (recipient_id, complaint_id, message) VALUES (%s,%s,%s)",
                (student["id"], cid, f"Your complaint #{cid} has been updated to: {new_status}"),
            )
        conn.commit()
        return jsonify({"ok": True})
    finally:
        cur.close(); conn.close()


@app.route("/api/complaints/<int:cid>/confirm", methods=["PATCH"])
@require_auth(["student"])
def confirm_resolution(cid):
    data = request.get_json(silent=True) or {}
    action = str(data.get("action") or "").strip()
    if action not in ("confirm", "dispute"):
        return jsonify({"error": "action must be 'confirm' or 'dispute'"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT email FROM users WHERE id = %s", (request.user_id,))
        user = cur.fetchone()
        cur.execute(
            "SELECT * FROM complaints WHERE complaint_id = %s AND student_email = %s",
            (cid, user["email"]),
        )
        if not cur.fetchone():
            return jsonify({"error": "Complaint not found"}), 404

        if action == "confirm":
            cur.execute("UPDATE complaints SET status = 'Resolved' WHERE complaint_id = %s", (cid,))
            cur.execute(
                "INSERT INTO resolution_logs (complaint_id, action, actor_role) VALUES (%s,'Confirmed by student','student')",
                (cid,),
            )
        else:
            cur.execute("UPDATE complaints SET status = 'Disputed' WHERE complaint_id = %s", (cid,))
            cur.execute(
                "INSERT INTO escalation_logs (complaint_id, reason) VALUES (%s,'Disputed by student')",
                (cid,),
            )
        conn.commit()
        return jsonify({"ok": True})
    finally:
        cur.close(); conn.close()


@app.route("/api/complaints/<int:cid>/force-resolve", methods=["PATCH"])
@require_auth(["caretaker"])
def force_resolve(cid):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE complaints SET status = 'Resolved' WHERE complaint_id = %s", (cid,))
        cur.execute(
            "INSERT INTO resolution_logs (complaint_id, action, actor_role, notes) VALUES (%s,'Force resolved','caretaker','Resolved by caretaker')",
            (cid,),
        )
        conn.commit()
        return jsonify({"ok": True})
    finally:
        cur.close(); conn.close()


# ── Housekeeping ──────────────────────────────────────────────────────────────

@app.route("/api/housekeeping", methods=["POST"])
@require_auth(["student"])
def create_housekeeping():
    data = request.get_json(silent=True) or {}
    task = str(data.get("task") or "").strip()
    if not task:
        return jsonify({"error": "Task is required"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM users WHERE id = %s", (request.user_id,))
        user = cur.fetchone()
        cur.execute(
            "INSERT INTO housekeeping_requests (student_email, hostel_name, room_number, floor, task, notes) VALUES (%s,%s,%s,%s,%s,%s)",
            (user["email"], user.get("hostel_name"), user.get("room_number"),
             user.get("floor"), task, str(data.get("notes") or "")),
        )
        conn.commit()
        return jsonify({"request_id": cur.lastrowid}), 201
    finally:
        cur.close(); conn.close()


@app.route("/api/housekeeping", methods=["GET"])
@require_auth(["student", "housekeeping", "caretaker"])
def get_housekeeping():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        if request.user_role == "student":
            cur.execute("SELECT email FROM users WHERE id = %s", (request.user_id,))
            user = cur.fetchone()
            cur.execute(
                "SELECT * FROM housekeeping_requests WHERE student_email = %s ORDER BY created_at DESC",
                (user["email"],),
            )
        else:
            cur.execute("SELECT * FROM housekeeping_requests ORDER BY created_at DESC")
        rows = cur.fetchall()
        for r in rows:
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


@app.route("/api/housekeeping/<int:rid>/status", methods=["PATCH"])
@require_auth(["housekeeping", "caretaker"])
def update_housekeeping_status(rid):
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status") or "").strip()
    if new_status not in ("In Progress", "Completed"):
        return jsonify({"error": "status must be 'In Progress' or 'Completed'"}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE housekeeping_requests SET status = %s WHERE request_id = %s",
            (new_status, rid),
        )
        conn.commit()
        return jsonify({"ok": True})
    finally:
        cur.close(); conn.close()


# ── Slots ─────────────────────────────────────────────────────────────────────

@app.route("/api/slots", methods=["POST"])
@require_auth(["staff"])
def create_slot():
    data = request.get_json(silent=True) or {}
    required = ["visit_date", "slot_time", "hostel_name"]
    missing = [f for f in required if not str(data.get(f) or "").strip()]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO slots (staff_id, visit_date, slot_time, hostel_name, max_capacity) VALUES (%s,%s,%s,%s,%s)",
            (request.user_id, data["visit_date"], data["slot_time"].strip(),
             data["hostel_name"].strip(), int(data.get("max_capacity") or 8)),
        )
        conn.commit()
        return jsonify({"slot_id": cur.lastrowid}), 201
    finally:
        cur.close(); conn.close()


@app.route("/api/slots", methods=["GET"])
@require_auth()
def get_slots():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """SELECT s.*, u.full_name AS staff_name
               FROM slots s JOIN users u ON s.staff_id = u.id
               WHERE s.visit_date >= CURDATE()
               ORDER BY s.visit_date, s.slot_time"""
        )
        rows = cur.fetchall()
        for r in rows:
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()
            if r.get("visit_date"):
                r["visit_date"] = str(r["visit_date"])
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


@app.route("/api/slots/<int:sid>/book", methods=["POST"])
@require_auth(["student"])
def book_slot(sid):
    data = request.get_json(silent=True) or {}
    complaint_id = data.get("complaint_id")
    if not complaint_id:
        return jsonify({"error": "complaint_id is required"}), 400

    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM slots WHERE slot_id = %s FOR UPDATE", (sid,))
        slot = cur.fetchone()
        if not slot:
            return jsonify({"error": "Slot not found"}), 404
        if slot["status"] == "full":
            return jsonify({"error": "This slot is full"}), 409

        cur.execute(
            "INSERT INTO bookings (complaint_id, slot_id) VALUES (%s,%s)",
            (int(complaint_id), sid),
        )
        new_count = slot["current_bookings"] + 1
        new_status = "full" if new_count >= slot["max_capacity"] else "available"
        cur.execute(
            "UPDATE slots SET current_bookings = %s, status = %s WHERE slot_id = %s",
            (new_count, new_status, sid),
        )
        conn.commit()
        return jsonify({"ok": True}), 201
    finally:
        cur.close(); conn.close()


# ── Notifications ─────────────────────────────────────────────────────────────

@app.route("/api/notifications", methods=["GET"])
@require_auth()
def get_notifications():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT * FROM notifications WHERE recipient_id = %s ORDER BY created_at DESC LIMIT 50",
            (request.user_id,),
        )
        rows = cur.fetchall()
        for r in rows:
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


@app.route("/api/notifications/read-all", methods=["PATCH"])
@require_auth()
def mark_all_read():
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE notifications SET is_read = 1 WHERE recipient_id = %s",
            (request.user_id,),
        )
        conn.commit()
        return jsonify({"ok": True})
    finally:
        cur.close(); conn.close()


# ── Escalations ───────────────────────────────────────────────────────────────

@app.route("/api/escalations/sweep", methods=["POST"])
def escalation_sweep():
    if request.headers.get("X-Cron-Secret", "") != CRON_SECRET:
        return jsonify({"error": "Forbidden"}), 403
    count = run_sweep(get_db)
    return jsonify({"escalated": count})


@app.route("/api/escalations", methods=["GET"])
@require_auth(["caretaker"])
def get_escalations():
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            """SELECT e.*, c.issue, c.category, c.status, c.student_email
               FROM escalation_logs e
               JOIN complaints c ON e.complaint_id = c.complaint_id
               ORDER BY e.escalated_at DESC"""
        )
        rows = cur.fetchall()
        for r in rows:
            if r.get("escalated_at"):
                r["escalated_at"] = r["escalated_at"].isoformat()
        return jsonify(rows)
    finally:
        cur.close(); conn.close()


# ── Health & error handlers ───────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Route not found"}), 404


@app.errorhandler(405)
def method_not_allowed(_):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    start_escalation_engine(get_db)
    app.run(debug=False, host="0.0.0.0", port=5000)
