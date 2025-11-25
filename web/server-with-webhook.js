// Example: Server with webhook integration
// This is an EXAMPLE file showing how to add webhook functionality
// You can use this as reference or copy the webhook part to your server.js

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { sendToLocalPC } from "./webhook-sender.js"; // Import webhook sender

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Upload route - WITH WEBHOOK INTEGRATION
app.post("/upload", upload.single("image"), async (req, res) => {
    console.log("Uploaded:", req.file.filename);
    
    // NEW: Send image to your local PC via webhook
    if (req.file) {
        try {
            // Read the uploaded file
            const imageBuffer = fs.readFileSync(req.file.path);
            
            // Send to local PC
            const result = await sendToLocalPC(
                imageBuffer, 
                req.file.originalname,
                {
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    uploadedAt: new Date().toISOString(),
                    serverFilename: req.file.filename
                }
            );
            
            if (result.success) {
                console.log(`✅ Image also sent to local PC: ${req.file.originalname}`);
            } else {
                console.log(`⚠️  Could not send to local PC: ${result.error}`);
            }
        } catch (error) {
            console.error("❌ Error sending to local PC:", error.message);
            // Don't fail the upload if webhook fails
        }
    }
    
    res.redirect("/");
});

app.get("/list", (req, res) => {
    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) return res.json([]);
        const images = files.filter(f =>
            /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
        );
        res.json(images);
    });
});

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "localhost";
}

app.listen(PORT, () => {
    const ip = getLocalIP();
    console.log("========================================");
    console.log("Server running!");
    console.log("Local:   http://localhost:" + PORT);
    console.log("Friends: http://" + ip + ":" + PORT);
    console.log("========================================");
});

