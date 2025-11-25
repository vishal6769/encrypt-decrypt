import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

// Needed to replicate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

const isVercel = process.env.VERCEL === "1";
const UPLOADS_DIR = isVercel
    ? path.join(os.tmpdir(), "uploads")
    : path.join(__dirname, "uploads");

// Make sure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Serve uploaded images
app.use("/uploads", express.static(UPLOADS_DIR));

// Multer config (image upload)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Upload route
app.post("/upload", upload.single("image"), (req, res) => {
    console.log("Uploaded:", req.file.filename);
    res.redirect("/");
});

// List all uploaded images
app.get("/list", (req, res) => {
    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) return res.json([]);
        const images = files.filter(f =>
            /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
        );
        res.json(images);
    });
});

// Get your local network IP (so friends can access)
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

// Start server
app.listen(PORT, () => {
    const ip = getLocalIP();
    console.log("========================================");
    console.log("Server running!");
    console.log("Local:   http://localhost:" + PORT);
    if (!isVercel) {
        console.log("Friends: http://" + ip + ":" + PORT);
    }
    console.log("========================================");
});
