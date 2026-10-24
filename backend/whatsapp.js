import fs from 'fs';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// Auto-detect system Google Chrome / Chromium on Linux VM to save disk space
const systemChromePath = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
].find(p => fs.existsSync(p));

const puppeteerConfig = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu'
    ]
};
if (systemChromePath) {
    console.log('Using system Chrome at:', systemChromePath);
    puppeteerConfig.executablePath = systemChromePath;
}

// Initialize the WhatsApp Client
// We use LocalAuth so it remembers your session across restarts
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerConfig
});

let isClientReady = false;

// Generate and display the QR code in the terminal
client.on('qr', (qr) => {
    console.log('\n=========================================');
    console.log('📲 SCAN THIS QR CODE WITH YOUR WHATSAPP');
    console.log('=========================================\n');
    qrcode.generate(qr, { small: true });
});

// When successfully authenticated
client.on('ready', async () => {
    console.log('✅ WhatsApp Web Client is Ready!');
    isClientReady = true;

    // Apply WhatsApp Web LID migration bypass
    try {
        await client.pupPage.evaluate(() => {
            try {
                if (window.injectToFunction) {
                    window.injectToFunction(
                        { module: 'WAWebLid1X1MigrationGating', function: 'Lid1X1MigrationUtils.isLidMigrated' },
                        () => false
                    );
                }
            } catch (_) {}
            try {
                const gating = window.require('WAWebLid1X1MigrationGating');
                if (gating?.Lid1X1MigrationUtils) {
                    gating.Lid1X1MigrationUtils.isLidMigrated = () => false;
                }
            } catch (_) {}
        });
        console.log('✅ WhatsApp LID migration bypass applied');
    } catch (e) {
        console.warn('LID bypass warning (non-fatal):', e.message);
    }
});

// Handle authentication failures
client.on('auth_failure', msg => {
    console.error('❌ WhatsApp Authentication Failed:', msg);
});

// Initialize the client (will be called from server.js)
export const initWhatsApp = () => {
    console.log('Starting WhatsApp Engine...');
    try {
        client.initialize().catch(err => {
            console.warn('⚠️ WhatsApp notice (non-fatal, continuing web server):', err.message);
        });
    } catch (e) {
        console.warn('⚠️ WhatsApp start error (non-fatal, continuing web server):', e.message);
    }
};

// Function to send OTP via WhatsApp
export const sendWhatsAppOTP = async (phoneNumber, otpCode) => {
    if (!isClientReady) {
        console.error('WhatsApp is not ready yet! Cannot send OTP.');
        throw new Error('WhatsApp not ready');
    }

    try {
        // Format number: remove + and spaces
        let cleanNumber = phoneNumber.replace(/\D/g, ''); 
        
        // Auto-add Indian country code if user only entered 10 digits
        if (cleanNumber.length === 10) {
            cleanNumber = '91' + cleanNumber;
        }

        // Apply WhatsApp Web LID migration bypass before sending
        await client.pupPage.evaluate(() => {
            try {
                if (window.injectToFunction) {
                    window.injectToFunction(
                        { module: 'WAWebLid1X1MigrationGating', function: 'Lid1X1MigrationUtils.isLidMigrated' },
                        () => false
                    );
                }
            } catch (_) {}
            try {
                const gating = window.require('WAWebLid1X1MigrationGating');
                if (gating?.Lid1X1MigrationUtils) {
                    gating.Lid1X1MigrationUtils.isLidMigrated = () => false;
                }
            } catch (_) {}
        }).catch(() => {});

        let targetId = `${cleanNumber}@c.us`;
        try {
            const numberId = await client.getNumberId(cleanNumber);
            if (numberId && numberId._serialized) {
                targetId = numberId._serialized;
            }
        } catch (e) {
            console.warn('getNumberId warning:', e.message);
        }

        const message = `🥛 *Milkman Dairy*\n\nYour Login OTP is: *${otpCode}*\nDo not share this code with anyone.`;
        
        try {
            await client.sendMessage(targetId, message);
        } catch (err) {
            if (err.message && err.message.includes('No LID')) {
                console.warn('Handling No LID error via direct WWebJS evaluation...');
                await client.pupPage.evaluate(async (chatId, text) => {
                    const wid = window.require('WAWebWidFactory').createWid(chatId);
                    let chat = window.require('WAWebCollections').Chat.get(wid);
                    if (!chat) {
                        try {
                            const findAction = window.require('WAWebFindChatAction');
                            const res = await findAction.findOrCreateLatestChat(wid);
                            chat = res?.chat;
                        } catch (_) {
                            chat = await window.require('WAWebCollections').Chat.find(wid);
                        }
                    }
                    if (chat) {
                        await window.WWebJS.sendMessage(chat, text);
                    } else {
                        throw new Error('Could not initialize chat for ' + chatId);
                    }
                }, targetId, message);
            } else {
                throw err;
            }
        }
        
        console.log(`✅ WhatsApp OTP sent to ${phoneNumber} (${targetId})`);
    } catch (error) {
        console.error('❌ Failed to send WhatsApp OTP:', error);
        throw error;
    }
};

export const sendWhatsAppMessage = async (chatId, message) => {
    if (!isClientReady) throw new Error('WhatsApp not ready');
    try {
        await client.sendMessage(chatId, message);
    } catch (error) {
        console.error('Failed to send WhatsApp message to', chatId, error);
    }
};
