#!/usr/bin/env python
"""
Cleanup script to remove old demo users from the database
that may be causing constraint violations
"""

import psycopg

DSN = "postgresql://postgres:GwppfXHhqYdoi7cR@localhost:5432/neurorail_db"

def main():
    try:
        # Connect to database
        with psycopg.connect(DSN) as conn:
            with conn.cursor() as cur:
                # Show current users
                print("📋 Current demo users in database:")
                cur.execute(
                    "SELECT id, email, is_admin, created_at FROM users ORDER BY created_at DESC"
                )
                users = cur.fetchall()
                
                if not users:
                    print("  No users in database")
                else:
                    for user_id, email, is_admin, created_at in users:
                        print(f"  • {email} (Admin: {is_admin}, Created: {created_at})")
                
                # Delete all users (fresh start)
                print("\n🗑️  Clearing all users from database...")
                cur.execute("DELETE FROM users")
                deleted_count = cur.rowcount
                conn.commit()
                print(f"  ✓ Deleted {deleted_count} users")
                
                # Verify
                print("\n✅ Database cleaned successfully!")
                cur.execute("SELECT COUNT(*) FROM users")
                remaining = cur.fetchone()[0]
                print(f"  Total users remaining: {remaining}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
