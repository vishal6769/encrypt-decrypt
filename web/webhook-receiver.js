// Webhook Receiver - Run this on your local PC to receive images from Vercel
// This creates a local server that receives uploaded images

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.RECEIVER_PORT || 9000;

// Directory to save received images on your PC
const RECEIVED_DIR = path.join(__dirname, 'received-images');

// Create received-images directory if it doesn't exist
if (!fs.existsSync(RECEIVED_DIR)) {
    fs.mkdirSync(RECEIVED_DIR, { recursive: true });
    console.log(`📁 Created directory: ${RECEIVED_DIR}`);
}

// Configure multer for receiving files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, RECEIVED_DIR);
    },
    filename: (req, file, cb) => {
        // Save with timestamp and original filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${file.originalname}`;
        cb(null, filename);
    }
});

const upload = multer({ storage });

// Webhook endpoint to receive images from Vercel
app.post('/webhook/receive-image', upload.single('image'), (req, res) => {
    try {
        const file = req.file;
        const filename = req.body.filename || file.originalname;
        const timestamp = req.body.timestamp || new Date().toISOString();
        const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

        if (!file) {
            return res.status(400).json({ error: 'No image received' });
        }

        console.log('\n' + '='.repeat(50));
        console.log('📥 NEW IMAGE RECEIVED!');
        console.log('='.repeat(50));
        console.log(`📁 Filename: ${filename}`);
        console.log(`💾 Saved as: ${file.filename}`);
        console.log(`📊 Size: ${(file.size / 1024).toFixed(2)} KB`);
        console.log(`🕐 Time: ${timestamp}`);
        console.log(`📂 Location: ${file.path}`);
        console.log('='.repeat(50) + '\n');

        // Send success response
        res.json({
            success: true,
            message: 'Image received successfully',
            filename: file.filename,
            path: file.path,
            timestamp: timestamp
        });
    } catch (error) {
        console.error('❌ Error receiving image:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/webhook/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Webhook receiver is running',
        port: PORT,
        receivedDir: RECEIVED_DIR
    });
});

// List received images
app.get('/webhook/list', (req, res) => {
    fs.readdir(RECEIVED_DIR, (err, files) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const images = files.filter(f => 
            /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
        ).map(f => ({
            filename: f,
            path: path.join(RECEIVED_DIR, f),
            size: fs.statSync(path.join(RECEIVED_DIR, f)).size
        }));
        res.json({ count: images.length, images });
    });
});

// Get local IP address
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Start the receiver server
app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log('\n' + '='.repeat(60));
    console.log('🖥️  WEBHOOK RECEIVER - Running on Your PC');
    console.log('='.repeat(60));
    console.log(`\n✅ Server is running!`);
    console.log(`\n📍 Local access: http://localhost:${PORT}`);
    console.log(`🌐 Network access: http://${ip}:${PORT}`);
    console.log(`\n📥 Webhook endpoint: http://${ip}:${PORT}/webhook/receive-image`);
    console.log(`📁 Images will be saved to: ${RECEIVED_DIR}`);
    console.log(`\n💡 Add this URL to Vercel environment variables:`);
    console.log(`   LOCAL_PC_WEBHOOK_URL=http://${ip}:${PORT}/webhook/receive-image`);
    console.log(`\n⚠️  Make sure your firewall allows connections on port ${PORT}`);
    console.log('='.repeat(60) + '\n');
});

