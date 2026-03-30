# 🔧 Debugging "Failed to create demo user" Error

## Quick Start

### Step 1: Access the Diagnostics Page

- Go to: `http://localhost:3000/diagnostics`
- This page will help you identify exactly where the problem is

### Step 2: Run Full Diagnostics

1. Click **"✅ Run Full Diagnostics"** button
2. Watch the results appear below
3. Check your browser DevTools Console (Press `F12` → Console tab)

### Step 3: Check Backend Logs

1. Look at the terminal where you're running the backend
2. You should see detailed print() statements showing:
   - What email is being processed
   - Whether the user already exists in the database
   - Whether the database commit succeeded or failed
   - The exact error message if it failed

## What Each Result Means

### ✅ All Checks Passed

**Meaning:** Backend and database are working fine.
**Action:** The error might be intermittent. Try:

1. Logging out (click logo)
2. Logging in again with a different email
3. Submitting a case again

### ❌ Backend Unreachable (Status 0)

**Meaning:** Frontend can't connect to backend at `http://127.0.0.1:8000`
**Fix:**

- Make sure backend is running: `uvicorn app.main:app --reload`
- Check the terminal shows "Application startup complete"
- Verify port 8000 is not blocked by firewall

### ❌ Backend Returns 500 Error

**Meaning:** Backend server is running but has an error
**Action:** Check backend terminal for error message and stack trace

### ❌ Mock Login Failed

**Meaning:** Demo user creation is failing specifically
**Action:**

- Check backend terminal for the exact database error
- Look for: "IntegrityError", "constraint violation", "transaction failed"
- See "Common Database Errors" section below

## Common Database Errors

### Error: "duplicate key value violates unique constraint"

**Cause:** User with that email already exists in database
**Fix:** Try login with different email (e.g., <test2@example.com>)

### Error: "FOREIGN KEY CONSTRAINT FAILED"

**Cause:** User creation succeeded but lost_found creation can't find user
**Fix:** This shouldn't happen - report if you see this

### Error: "NOT NULL constraint failed"

**Cause:** One of the required fields (email, id) is missing or null
**Fix:** Check that email is valid in the login form

### Error: "no matching row"

**Cause:** User was created but then deleted before case creation
**Fix:** This is a race condition - try again

### Connection refused (port 5432)

**Cause:** PostgreSQL database is not running
**Fix:**

- Make sure PostgreSQL service is running
- On Windows: Services.msc → search "PostgreSQL" → right-click "Start"
- On Mac: `brew services start postgresql`
- On Linux: `sudo systemctl start postgresql`

## How to Read Backend Logs

Your backend terminal should show something like this when you try to create a case:

```
🔐 Attempting to verify token for email: test@example.com
📍 Checking if demo user exists in database...
✓ Query executed successfully
❌ User not found, creating new demo user...
🆔 Generated UUID: a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6
💾 Attempting to commit user to database...
✅ Demo user created successfully!
```

If you see errors, they'll look like:

```
❌ Database error: IntegrityError: duplicate key violates unique constraint "users_email_key"
```

## Checking Database Directly (Advanced)

If you want to see what users actually exist in the database:

### On Windows (using pgAdmin or psql)

```sql
-- Connect to your PostgreSQL database
SELECT id, email, is_admin, created_at FROM users;
```

### Using Python

```bash
cd backend
python -c "from app.database import engine, SessionLocal; from app.models.user import User; from sqlalchemy import select; import asyncio; 
async def check(): 
    async with SessionLocal() as db: 
        result = await db.execute(select(User))
        for user in result.scalars(): 
            print(f'User: {user.email} | ID: {user.id}')
asyncio.run(check())"
```

## Testing Specific Endpoints

### Test Health Check

```bash
curl http://127.0.0.1:8000/health
```

Should return: `{"status":"healthy"}`

### Test Mock Login

```bash
curl -X POST http://127.0.0.1:8000/mock-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Should return: Token with `access_token`, `token_type`, `role`

### Test Creating a Case (with valid token)

```bash
# First get a token from mock-login, then:
curl -X POST http://127.0.0.1:8000/lost-found \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "location=Platform 3"
```

## Browser Console Tips

When you visit `/diagnostics` and run tests:

1. **Open DevTools:** Press `F12`
2. **Go to Console tab:** See all the logs from diagnostic tests
3. **Look for patterns:**
   - Green messages (✅) = Success
   - Red messages (❌) = Failures
   - Yellow messages (🔐) = Important events

4. **Copy logs:** Right-click → "Save as" to save console logs to file

## Steps to Debug

### For "Failed to create lost and found case" error

1. **Go to** `/diagnostics` page
2. **Click** "✅ Run Full Diagnostics"
3. **Record** any errors you see
4. **Check** backend terminal output (the terminal where uvicorn is running)
5. **If database error**, see "Common Database Errors" above
6. **If backend unreachable**, verify backend is running on port 8000
7. **If mock login failed**, that's the root cause - database issue
8. **Share** the exact error message with development team

## Quick Fixes to Try

1. **Clear browser cache:** Ctrl+Shift+Delete → Clear all
2. **Restart backend:** Stop uvicorn (Ctrl+C) and run again
3. **Restart database:** Restart PostgreSQL service
4. **Try different email:** Sometimes there are constraint issues with duplicates
5. **Check database is empty:** Run SQL above to see if there are leftover records

## Environment Variables to Check

Make sure these are set correctly:

**Backend (.env or in code):**

- `DATABASE_URL` = `postgresql+asyncpg://user:password@localhost/neuro_rail`
- `SECRET_KEY` = something secure
- `ALGORITHM` = "HS256"

**Frontend (.env.local or next.config.ts):**

- `NEXT_PUBLIC_API_BASE_URL` = `http://127.0.0.1:8000`
- `NEXT_PUBLIC_DEBUG` = "true" (for automatic diagnostics on startup)

## Still Having Issues?

1. Check that both backend AND frontend servers are running
2. Verify database is running and accessible
3. Look at exact error messages in backend terminal
4. Clear browser cache and log out/in again
5. Restart both services from scratch
6. Check that all files from the latest update are saved

**Most Common Fix:** Restart backend and try again (fixes many transaction issues).
