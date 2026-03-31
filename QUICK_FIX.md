# ⚡ QUICK FIX - LIVE ACCURACY & SAFETY INTELLIGENCE

## TL;DR

✅ **Everything works!** Just **log in first** - that's it!

---

## 🚀 THE FIX IN 3 STEPS

### Step 1: Go to Login

```
http://localhost:3000/login
```

### Step 2: Log In

```
Email: admin@demo.local
Password: (any password)
```

### Step 3: Use the Tabs

- Click "Live Accuracy" → see metrics
- Click "Safety Intelligence" → see behavior monitoring

**Done!** ✅

---

## Why This Works

- ✅ Backend is running (/ws/accuracy, /ws/intel active)
- ✅ Frontend is running (next dev server active)  
- ✅ Database is connected
- ✅ WebSocket hooks are working
- ✅ Components are rendering
- **BUT**: WebSocket needs authentication token from cookies
- **The token comes from**: Successful login
- **Without login**: No token → No WebSocket → No data

---

## Check If It's Working

When logged in, open browser console (F12):

```
Look for: [useAccuracySocket] Connected
         [useIntelSocket] Connected
```

If you see these, it's working! ✅

---

## Still Not Working?

1. **Clear browser cache** (Ctrl+Shift+Delete) and try again
2. **Check cookies** (F12 → Application → Cookies):
   - Should see `nr_token` and `nr_role`
   - If missing, you didn't log in properly
3. **Check console** (F12 → Console):
   - Look for error messages
   - Check error details
4. **Restart browsers** - Close all tabs, start fresh

---

## What to Expect

### Live Accuracy Tab

- 4 metric cards (Accuracy, Precision, Recall, F1-Score)
- "Live stream" indicator  
- Metrics show 0.0% (normal - no data yet)
- Updates every 2 seconds

### Safety Intelligence Tab

- 3 panels (Behavior, Risks, Alerts)
- Empty initially (normal - send detections to populate)
- Updates real-time when detections arrive

---

## Test with Detection Data (Optional)

To see Safety Intelligence with data:

```python
python -c "
import requests, json
from datetime import datetime

token = requests.post('http://localhost:8000/mock-login', 
                     json={'email': 'admin@demo.local'}).json()['access_token']

with open('backend/uploads/lost-found/00d92660-5a31-56cd-a21e-afbefe8620c8_20240813_103133.jpg', 'rb') as f:
    requests.post('http://localhost:8000/detections/ingest',
        headers={'Authorization': f'Bearer {token}'},
        files={'file': f},
        data={
            'camera_id': 'TEST',
            'detected_at': datetime.now().isoformat(timespec='seconds'),
            'detections': json.dumps([
                {'label': 'person', 'confidence': 0.95, 
                 'bbox': {'x': 100, 'y': 100, 'w': 200, 'h': 300}}
            ])
        }
    )

print('Data sent - check Safety Intelligence tab')
"
```

---

## That's It

**You're all set.** Login → Check tabs → Done! 🎉

---

*Everything works. Just log in!*
