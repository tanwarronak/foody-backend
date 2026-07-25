import TelegramBot from 'node-telegram-bot-api';

export const notifyOwner = async (orderId,orderData) => {
    try{
        const notificationMessage =  `
            ✨ *📥 New Order Received!* ✨
            \-----------------------------
            🆔 *Order ID:* \`${orderId}\`
            📌 *Status:* ${orderData.order_status}
            💳 *Payment Method:* ${orderData.payment_method}
            💰 *Total Amount:* \$${orderData.total_amount}

            🏪 *Restaurant Details:*
            🍽 *Name:* ${orderData.restaurant_name}
            📞 *Contact:* ${orderData.restaurant_contact}

            👤 *Customer Details:*
            👤 *Name:* ${orderData.customer_name}
            📞 *Contact:* ${orderData.customer_contact}
            📍 *Address:* ${orderData.customer_address}`.trim();
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

        let options = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        }
        await bot.sendMessage(process.env.CHAT_ID, notificationMessage, options);
        
    }
    catch(error){
        console.error('Error notifying owner:', error);
    }
}
