import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// Initialize the WhatsApp Client
// We use LocalAuth so it remembers your session across restarts
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox']
    }
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
client.on('ready', () => {
    console.log('✅ WhatsApp Web Client is Ready!');
    isClientReady = true;
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
        
        const chatId = `${cleanNumber}@c.us`;

        const message = `🥛 *Milkman Dairy*\n\nYour Login OTP is: *${otpCode}*\nDo not share this code with anyone.`;
        
        await client.sendMessage(chatId, message);
        console.log(`✅ WhatsApp OTP sent to ${phoneNumber}`);
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
