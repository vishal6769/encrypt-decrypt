// Webhook sender module - sends uploaded images to your PC
// This will be called when an image is uploaded on Vercel

import https from 'https';
import http from 'http';
import FormData from 'form-data';

/**
 * Sends an uploaded image to your local PC via webhook
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {string} filename - Original filename
 * @param {object} metadata - Additional metadata (optional)
 */
export async function sendToLocalPC(imageBuffer, filename, metadata = {}) {
    // Get webhook URL from environment variable
    // Set this in Vercel: VERCEL -> Settings -> Environment Variables
    const WEBHOOK_URL = process.env.LOCAL_PC_WEBHOOK_URL;
    
    if (!WEBHOOK_URL) {
        console.log('⚠️  LOCAL_PC_WEBHOOK_URL not set - skipping webhook send');
        return { success: false, error: 'Webhook URL not configured' };
    }

    try {
        // Create form data with the image
        const formData = new FormData();
        formData.append('image', imageBuffer, {
            filename: filename,
            contentType: metadata.mimetype || 'image/png'
        });
        formData.append('filename', filename);
        formData.append('timestamp', new Date().toISOString());
        formData.append('metadata', JSON.stringify(metadata));

        // Send to your local PC
        return new Promise((resolve, reject) => {
            const url = new URL(WEBHOOK_URL);
            const client = url.protocol === 'https:' ? https : http;

            const req = client.request({
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: formData.getHeaders(),
                timeout: 30000 // 30 second timeout
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`✅ Image sent to local PC: ${filename}`);
                        resolve({ success: true, response: data });
                    } else {
                        console.log(`❌ Failed to send image: ${res.statusCode}`);
                        resolve({ success: false, error: `HTTP ${res.statusCode}`, response: data });
                    }
                });
            });

            req.on('error', (error) => {
                console.log(`❌ Webhook error: ${error.message}`);
                resolve({ success: false, error: error.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Request timeout' });
            });

            formData.pipe(req);
        });
    } catch (error) {
        console.log(`❌ Error sending webhook: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Alternative: Send via email (requires email service)
 * You can use services like SendGrid, Mailgun, or Gmail API
 */
export async function sendViaEmail(imageBuffer, filename, metadata = {}) {
    // This is a placeholder - implement with your preferred email service
    // Example: SendGrid, Nodemailer, etc.
    console.log('📧 Email sending not implemented - use webhook instead');
    return { success: false, error: 'Email not configured' };
}
