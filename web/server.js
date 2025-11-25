import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { put, list } from "@vercel/blob";

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

// Serve uploaded images locally (Vercel instances stream from Blob storage instead)
if (!isVercel) {
    app.use("/uploads", express.static(UPLOADS_DIR));
}

// Multer config (image upload)
const storage = isVercel
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => cb(null, UPLOADS_DIR),
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
    });
const upload = multer({ storage });

// Upload route
app.post("/upload", upload.single("image"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const safeName = Date.now() + "-" + req.file.originalname.replace(/\s+/g, "_");

        if (isVercel) {
            // Persist image to Vercel Blob (needs BLOB_READ_WRITE_TOKEN env var)
            const blob = await put(`uploads/${safeName}`, req.file.buffer, {
                access: "public",
                token: process.env.BLOB_READ_WRITE_TOKEN
            });
            console.log("Uploaded to Blob:", blob.url);
        } else {
            console.log("Uploaded locally:", safeName);
        }

        res.redirect("/");
    } catch (err) {
        next(err);
    }
});

// List all uploaded images
app.get("/list", async (req, res, next) => {
    try {
        if (isVercel) {
            const blobs = await list({
                prefix: "uploads/",
                token: process.env.BLOB_READ_WRITE_TOKEN
            });
            const images = blobs.blobs
                .filter(b => /\.(jpg|jpeg|png|gif|webp)$/i.test(b.pathname))
                .map(b => ({
                    name: b.pathname.replace("uploads/", ""),
                    url: b.url
                }));
            return res.json(images);
        }

        fs.readdir(UPLOADS_DIR, (err, files) => {
            if (err) return res.json([]);
            const images = files
                .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
                .map(name => ({
                    name,
                    url: `/uploads/${name}`
                }));
            res.json(images);
        });
    } catch (err) {
        next(err);
    }
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
