# Quick Guide: Receive Images on Your PC

## 🚀 3 Simple Steps

### Step 1: Run Receiver on Your PC

```bash
cd web
npm install form-data
node webhook-receiver.js
```

**Copy the webhook URL shown** (e.g., `http://192.168.1.100:9000/webhook/receive-image`)

### Step 2: Add to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name**: `LOCAL_PC_WEBHOOK_URL`
   - **Value**: The URL from Step 1
3. Click Save

### Step 3: Update Your Server Code

Add these 2 lines to your `server.js`:

**At the top (with other imports):**
```javascript
import { sendToLocalPC } from "./webhook-sender.js";
```

**In your upload route, make it async and add:**
```javascript
app.post("/upload", upload.single("image"), async (req, res) => {
    console.log("Uploaded:", req.file.filename);
    
    // Send to your PC
    if (req.file) {
        const imageBuffer = fs.readFileSync(req.file.path);
        await sendToLocalPC(imageBuffer, req.file.originalname);
    }
    
    res.redirect("/");
});
```

**That's it!** Redeploy to Vercel and images will start coming to your PC in the `received-images` folder.

---

## 📁 Where Images Are Saved

```
web/received-images/
```

---

## ⚠️ Important Notes

1. **Keep receiver running** - The `webhook-receiver.js` must stay running on your PC
2. **IP address** - If your PC's IP changes, update the Vercel environment variable
3. **Firewall** - Make sure port 9000 is allowed in your firewall

---

For detailed setup, see `WEBHOOK_SETUP.md`

