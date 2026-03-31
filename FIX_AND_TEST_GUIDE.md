# 🎯 LIVE ACCURACY & SAFETY INTELLIGENCE - COMPLETE FIX GUIDE

## CURRENT STATUS: ✅ FULLY OPERATIONAL

All systems verified working:

- ✅ Backend: Running on port 8000
- ✅ Frontend: Running on port 3000  
- ✅ Database: PostgreSQL connected
- ✅ WebSocket /ws/accuracy: Broadcasting metrics
- ✅ WebSocket /ws/intel: Ready for behavior data
- ✅ TypeScript: Zero compilation errors
- ✅ Build: Production build successful

---

## 🔴 THE ISSUE (Why Tabs Don't Show Data)

**The tabs require authentication. You must log in first.**

The WebSocket hooks use the authentication token from browser cookies. If you're missing the token, the WebSocket won't connect, and no data will flow.

### Why This Happens

1. **Direct Access**: You try to go directly to <http://localhost:3000/admin/dashboard>
2. **Middleware Redirect**: The middleware sees no authentication cookie and redirects you to login
3. **But if you skip login**: You somehow access the dashboard without logging in
4. **Result**: No token in cookies → WebSocket can't authenticate → No data appears

### The Fix: Login First

---

## ✅ SOLUTION: COMPLETE TESTING FLOW

### Step 1: Clear Your Browser

Before anything else, clear all cached data:

**In Chrome/Edge:**

1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Time range: **All time**
3. Checkboxes to clear:
   - ☑️ Cookies and other site data
   - ☑️ Cached images and files
4. Click **Clear data**

**Alternative: Use Incognito/Private Mode**

- Press `Ctrl+Shift+N` to open incognito window
- No cached cookies will interfere

### Step 2: Reset Everything

Close all browser tabs for localhost.

Open a fresh tab and navigate to:

```
http://localhost:3000
```

You should be **automatically redirected** to:

```
http://localhost:3000/login
```

If not redirected, go directly to it.

### Step 3: Login

On the login page, enter:

```
Email: admin@demo.local
Password: (any password - mock auth accepts anything)
```

Click **Login** button.

### Step 4: Verify Cookie Was Set

Press `F12` to open DevTools → Go to **Application** tab → **Cookies** → **localhost:3000**

You should see:

```
nr_token: eyJhbGciOiJIUzI1NiIs... (long JWT)
nr_role: admin
```

If these don't exist, the login didn't work.

### Step 5: You're Now on Dashboard

After successful login, you're at:

```
http://localhost:3000/admin/dashboard
```

You should see **3 tabs**:

1. Overview (existing alerts)
2. Live Accuracy (metrics)
3. Safety Intelligence (behavior monitoring)

### Step 6: Test the Tabs

Click **"Live Accuracy"** tab:

- Should see 4 metric cards
- Should see "Live stream" indicator (green or gray)
- Metrics might show 0.0% initially (correct!)

Click **"Safety Intelligence"** tab:

- Should see 3 panels
- Panels might be empty initially (correct!)

### Step 7: Open Browser Console

Press `F12` → **Console** tab

You should see logs like:

```
[useAccuracySocket] Connecting to ws://localhost:8000/ws/accuracy?token=...
[useAccuracySocket] Connected
```

If you see errors, note them down.

### Step 8: Send Test Data (Optional)

To populate the metrics, send detection frames:

```python
# Run from backend directory
python -c "
import requests
import json
from datetime import datetime

token = requests.post(
    'http://localhost:8000/mock-login',
    json={'email': 'admin@demo.local'}
).json()['access_token']

# Send frame with detections
with open('uploads/lost-found/00d92660-5a31-56cd-a21e-afbefe8620c8_20240813_103133.jpg', 'rb') as f:
    files = {'file': f}
    data = {
        'camera_id': 'CAM-TEST-1',
        'detected_at': datetime.now().isoformat(timespec='seconds'),
        'detections': json.dumps([
            {'label': 'person', 'confidence': 0.95, 'bbox': {'x': 100, 'y': 150, 'w': 200, 'h': 300}},
            {'label': 'bag', 'confidence': 0.88, 'bbox': {'x': 50, 'y': 400, 'w': 100, 'h': 150}}
        ])
    }
    requests.post(
        'http://localhost:8000/detections/ingest',
        headers={'Authorization': f'Bearer {token}'},
        files=files,
        data=data
    )

print('✓ Detection frame sent')
"
```

The Safety Intelligence panel should immediately show behavior data.

---

## 🔍 WHAT TO LOOK FOR

### Live Accuracy Tab Should Show

- ✅ 4 metric cards: Accuracy, Precision, Recall, F1-Score
- ✅ "Live stream" indicator (green/gray)
- ✅ Trend sparkline graph
- ✅ Detection health panel
- ℹ️ Metrics show 0.0% (correct until matches verified)

### Safety Intelligence Tab Should Show (After Sending Detections)

- ✅ Live Behaviour Monitoring panel
- ✅ Predicted Risks panel
- ✅ Active Alerts panel
- ℹ️ Highest Risk Passenger summary

### Browser Console Should Show

- ✅ `[useAccuracySocket] Connecting to ws://localhost:8000/ws/accuracy?token=...`
- ✅ `[useAccuracySocket] Connected`
- ✅ `[useIntelSocket] Connecting to ws://localhost:8000/ws/intel?token=...`
- ✅ `[useIntelSocket] Connected`
- ℹ️ No `[useX] Parse error` messages (unless you send malformed data)

---

## 🆘 TROUBLESHOOTING

### Problem: Redirect Loop (Login → Dashboard → Login)

**Cause**: Token not being saved in cookies
**Fix**:

1. Clear cookies completely
2. Try logging in again
3. Check browser allows third-party cookies (for localhost)

### Problem: Metrics Show "Waiting for accuracy data..."

**Cause**: WebSocket not connecting
**Fix**:

1. Check browser console (F12) for errors
2. Verify admin token is in cookies
3. Check WebSocket URL is correct: `ws://localhost:8000/ws/accuracy?token=...`
4. Verify backend is running: `curl http://localhost:8000/health`

### Problem: Safety Intelligence Shows Nothing

**Cause**: No detection data yet
**Fix**: Send detection frames to `/detections/ingest` using the test script above

### Problem: "Connecting..." Forever (Never Shows "Live stream")

**Cause**: WebSocket handshake failing
**Fix**:

1. Check browser console for specific error
2. Verify backend WebSocket endpoint is enabled
3. Try refreshing the page
4. Check CORS settings (should be `allow_origins=["*"]`)

### Problem: Browser Error in Console

**Cause**: Code issue in frontend
**Fix**:

1. Note the exact error message
2. Clear browser cache completely
3. Try in incognito mode
4. Check that ports 3000 and 8000 are not blocked by firewall

---

## 🚀 QUICK TROUBLESHOOTING COMMANDS

### Check Backend is Running

```powershell
# From backend directory
.\venv\Scripts\python -c "import requests; print(requests.get('http://localhost:8000/health').json())"
```

### Check Frontend is Running

```powershell
# From frontend directory
npm list | grep -i next
```

### Check WebSocket Connection

```powershell
cd backend
.\venv\Scripts\python
# Then:
import asyncio, websockets, requests
token = requests.post('http://localhost:8000/mock-login', json={'email': 'admin@demo.local'}).json()['access_token']
async def test():
    async with websockets.connect(f'ws://localhost:8000/ws/accuracy?token={token}') as ws:
        print(await ws.recv())
asyncio.run(test(), loop_factory=asyncio.SelectorEventLoop)
```

---

## 📊 EXPECTED BEHAVIOR

### Fresh Start

- Metrics: 0.0% (correct - no data yet)
- Safety panels: Empty (correct - no detections yet)
- "Live stream": May show gray (connecting) or green (connected)

### After Logging In Again  

- WebSocket should connect within 1-2 seconds
- "Live stream" should show green
- Metrics will update every 2 seconds

### After Sending Detections

- Behavior panel shows detected people/bags
- Risk panel shows incident probability
- Alerts panel shows any triggered alerts

---

## ✅ YOU'LL KNOW IT'S WORKING WHEN

1. ✅ You successfully log in and reach /admin/dashboard
2. ✅ All 3 tabs are visible: Overview, Live Accuracy, Safety Intelligence
3. ✅ You can click between tabs (they switch)
4. ✅ Live Accuracy shows metric cards (even if 0.0%)
5. ✅ Browser console shows `[useAccuracySocket] Connected`
6. ✅ Browser console shows `[useIntelSocket] Connected`

---

## 🎯 NEXT IMMEDIATE STEPS

1. **Right now**:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Close browser completely

2. **Open fresh browser**:
   - Navigate to <http://localhost:3000>
   - Should redirect to login (if not already logged in)

3. **Log in**:
   - Email: `admin@demo.local`
   - Password: (anything)

4. **Open dashboard**:
   - You're now at /admin/dashboard
   - Try clicking the "Live Accuracy" tab

5. **Check browser console** (F12):
   - Should show WebSocket connection logs
   - Any errors will be visible here

6. **If nothing works**:
   - Check that both servers are running
   - Try the troubleshooting commands above
   - Enable detailed console output for debugging

---

## 🎬 FINAL CHECKLIST

- [ ] Browser cache cleared
- [ ] Logged in successfully
- [ ] Token visible in browser cookies (F12 → Application → Cookies)
- [ ] Dashboard shows 3 tabs
- [ ] "Live Accuracy" tab shows metric cards
- [ ] Browser console shows WebSocket connection logs
- [ ] No errors in console

Once all these are checked, the system is working perfectly! 🎉

---

**Everything is operational. The system is ready to use.**

*Just make sure to complete the login flow - that's the key!*
