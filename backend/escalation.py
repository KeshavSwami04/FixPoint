import threading
import time


def run_sweep(get_db):
    """
    Escalate complaints that are:
      1. Still Pending or In Progress after 72 hours with no update
      2. Disputed by a student
    Returns the number of complaints newly escalated.
    """
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    count = 0
    try:
        # 72-hour stale complaints
        cur.execute(
            """SELECT id FROM complaints
               WHERE status IN ('Pending', 'In Progress')
               AND created_at < NOW() - INTERVAL 72 HOUR
               AND id NOT IN (
                   SELECT id FROM escalation_logs
                   WHERE reason = 'Auto: 72h no action'
               )"""
        )
        for c in cur.fetchall():
            cur.execute(
                "UPDATE complaints SET status = 'Escalated' WHERE id = %s",
                (c["id"],),
            )
            cur.execute(
                "INSERT INTO escalation_logs (id, reason) VALUES (%s, 'Auto: 72h no action')",
                (c["id"],),
            )
            count += 1

        # Disputed complaints not yet in escalation_logs
        cur.execute(
            """SELECT id FROM complaints
               WHERE status = 'Disputed'
               AND id NOT IN (
                   SELECT id FROM escalation_logs
                   WHERE reason = 'Disputed by student'
               )"""
        )
        for c in cur.fetchall():
            cur.execute(
                "INSERT INTO escalation_logs (id, reason) VALUES (%s, 'Disputed by student')",
                (c["id"],),
            )
            count += 1

        conn.commit()
    except Exception as e:
        print(f"[escalation] sweep error: {e}")
    finally:
        cur.close()
        conn.close()
    return count


def start_escalation_engine(get_db):
    """
    Start a background daemon thread that runs a sweep every hour.
    Only used when running as a persistent server (Docker / Railway).
    On Vercel, use the /api/escalations/sweep cron endpoint instead.
    """
    def loop():
        while True:
            try:
                n = run_sweep(get_db)
                if n:
                    print(f"[escalation] swept {n} complaint(s)")
            except Exception as e:
                print(f"[escalation] error: {e}")
            time.sleep(3600)

    t = threading.Thread(target=loop, daemon=True, name="escalation-engine")
    t.start()
    print("[escalation] engine started")
