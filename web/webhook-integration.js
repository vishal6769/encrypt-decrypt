// Integration module - Add this to your existing server.js
// This file shows how to integrate webhook sending into your upload route
// DO NOT modify existing files - just import and use this

import { sendToLocalPC } from './webhook-sender.js';

/**
 * Call this function after an image is uploaded
 * This will send the image to your local PC
 * 
 * Usage in your upload route:
 * 
 * import { sendToLocalPC } from './webhook-integration.js';
 * 
 * app.post("/upload", upload.single("image"), async (req, res) => {
 *     // ... your existing code ...
 *     
 *     // NEW: Send to local PC
 *     if (req.file) {
 *         const imageBuffer = fs.readFileSync(req.file.path);
 *         await sendToLocalPC(imageBuffer, req.file.originalname, {
 *             mimetype: req.file.mimetype,
 *             size: req.file.size,
 *             uploadedAt: new Date().toISOString()
 *         });
 *     }
 *     
 *     // ... rest of your code ...
 * });
 */

export { sendToLocalPC };

