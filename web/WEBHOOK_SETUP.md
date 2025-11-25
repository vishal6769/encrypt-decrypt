# Webhook Setup: Receive Images on Your PC from Vercel

This guide shows you how to set up a system where images uploaded on your Vercel-deployed website automatically get sent to your PC.

## 📋 Overview

1. **Webhook Receiver** - Runs on your PC, receives images
2. **Webhook Sender** - Runs on Vercel, sends images to your PC
3. **Integration** - Connect your upload route to send images

---

## 🖥️ Step 1: Set Up Receiver on Your PC

### Option A: Quick Start (Recommended)

1. **Install dependencies** (if not already):
```bash
cd web
npm install express multer form-data
```

2. **Start the receiver**:
```bash
node webhook-receiver.js
```

3. **You'll see output like**:
```
🌐 Network access: http://192.168.1.100:9000
📥 Webhook endpoint: http://192.168.1.100:9000/webhook/receive-image
```

4. **Copy the webhook endpoint URL** (you'll need it for Step 2)

### Option B: Run as Background Service (Keep Running)

**On macOS/Linux:**
```bash
# Install PM2 globally
npm install -g pm2

# Start receiver as background service
pm2 start webhook-receiver.js --name image-receiver

# Make it start on boot
pm2 startup
pm2 save
```

**On Windows:**
- Use Task Scheduler or NSSM to run as a service
- Or use `node-windows` npm package

---

## ☁️ Step 2: Configure Vercel

### 2.1 Add Environment Variable

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `LOCAL_PC_WEBHOOK_URL`
   - **Value**: `http://YOUR_IP:9000/webhook/receive-image`
     - Replace `YOUR_IP` with your PC's IP address from Step 1
     - Example: `http://192.168.1.100:9000/webhook/receive-image`
   - **Environment**: Production (and Preview if you want)

4. **Click Save**

### 2.2 Update Your Server Code

Add webhook sending to your upload route. You have two options:

#### Option A: Use the Example File (Easiest)

Replace your `server.js` with `server-with-webhook.js` (it's already set up):

```bash
cp server-with-webhook.js server.js
```

#### Option B: Add to Existing server.js

Add these lines to your existing `server.js`:

**1. Import at the top:**
```javascript
import { sendToLocalPC } from "./webhook-sender.js";
```

**2. Modify your upload route to be async and send webhook:**
```javascript
app.post("/upload", upload.single("image"), async (req, res) => {
    console.log("Uploaded:", req.file.filename);
    
    // NEW: Send image to your local PC
    if (req.file) {
        try {
            const imageBuffer = fs.readFileSync(req.file.path);
            await sendToLocalPC(imageBuffer, req.file.originalname, {
                mimetype: req.file.mimetype,
                size: req.file.size
            });
        } catch (error) {
            console.error("Webhook error:", error);
            // Don't fail upload if webhook fails
        }
    }
    
    res.redirect("/");
});
```

### 2.3 Install form-data on Vercel

Add to your `package.json` dependencies:
```json
{
  "dependencies": {
    "form-data": "^3.0.0"
  }
}
```

Then redeploy to Vercel.

---

## 🌐 Step 3: Handle Dynamic IP Address (Important!)

Your PC's IP might change. Here are solutions:

### Option A: Use a Dynamic DNS Service (Recommended)

1. Sign up for a free DDNS service (NoIP, DuckDNS, etc.)
2. Set up DDNS on your router or use their client
3. Use the DDNS URL instead of IP: `http://yourname.ddns.net:9000/webhook/receive-image`

### Option B: Use ngrok (For Testing)

1. Install ngrok: https://ngrok.com/
2. Start your receiver, then run:
```bash
ngrok http 9000
```
3. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
4. Use this URL in Vercel environment variable

### Option C: Use a VPN or Tunneling Service

- Use Tailscale, ZeroTier, or similar
- Get a static IP from your service

---

## 🔒 Step 4: Security (Optional but Recommended)

### Add Authentication

Edit `webhook-receiver.js` to add a secret token:

**In webhook-receiver.js**, add before the route:
```javascript
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-secret-key-here';

// Middleware to check secret
app.use('/webhook/receive-image', (req, res, next) => {
    const authHeader = req.headers['x-webhook-secret'];
    if (authHeader !== WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
```

**In webhook-sender.js**, add header:
```javascript
req.setHeader('x-webhook-secret', process.env.WEBHOOK_SECRET);
```

Add `WEBHOOK_SECRET` to Vercel environment variables.

---

## ✅ Testing

1. **Start receiver** on your PC
2. **Upload an image** on your Vercel website
3. **Check the receiver console** - you should see:
   ```
   📥 NEW IMAGE RECEIVED!
   📁 Filename: test.jpg
   💾 Saved as: 2024-01-15T10-30-00_test.jpg
   ```
4. **Check the `received-images` folder** on your PC

---

## 📁 Where Are Images Saved?

Images are saved to:
```
web/received-images/
```

You'll see files like:
- `2024-01-15T10-30-00_original-image.jpg`
- `2024-01-15T10-35-12_another-image.png`

---

## 🐛 Troubleshooting

### Images Not Arriving?

1. **Check receiver is running**: Visit `http://YOUR_IP:9000/webhook/health`
2. **Check firewall**: Make sure port 9000 is open
3. **Check Vercel logs**: Look for webhook errors in Vercel dashboard
4. **Check receiver logs**: See console output on your PC

### Connection Refused?

- Your PC's IP address changed → Update Vercel environment variable
- Firewall blocking → Allow port 9000 in firewall settings
- Router blocking → Forward port 9000 to your PC (port forwarding)

### Vercel Can't Reach Your PC?

- Use ngrok for testing (see Step 3, Option B)
- Use a VPN service (Tailscale, etc.)
- Set up proper port forwarding on your router

---

## 🔄 Alternative: Use Cloud Storage + Sync

Instead of direct webhook, you could:

1. **Save to AWS S3 / Google Cloud Storage** from Vercel
2. **Sync to your PC** using:
   - `rclone` (syncs cloud storage to local)
   - Cloud storage desktop app (Dropbox, Google Drive, etc.)
   - Scheduled script to download from cloud

This is more reliable but requires cloud storage setup.

---

## 📝 Quick Reference

**Start Receiver:**
```bash
node webhook-receiver.js
```

**Vercel Environment Variable:**
```
LOCAL_PC_WEBHOOK_URL=http://YOUR_IP:9000/webhook/receive-image
```

**Check if Receiver is Running:**
```
curl http://YOUR_IP:9000/webhook/health
```

**View Received Images:**
```
curl http://YOUR_IP:9000/webhook/list
```

---

## 🎉 That's It!

Now when someone uploads an image on your Vercel website, it will automatically appear in the `received-images` folder on your PC!

