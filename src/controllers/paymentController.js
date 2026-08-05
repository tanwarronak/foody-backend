import {razorpayInstance} from "../config/razorpayConfig.js";
import {Order} from "../models/ordersModel.js";
import crypto from "crypto";
import {Payment} from "../models/paymentModel.js";

export const verifyOrder = async (req, res) => {
    try{
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
        

        const order = await Order.findById(req.params.order_id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Update payment status in the database
            const payment = new Payment({
                payment_order_id: razorpay_order_id,
                order_id: order._id,
                payment_method: "online",
                amount: order.total_amount,
                payment_status: "paid",
                transaction_id: razorpay_payment_id,
                paid_at: new Date()
            });
            await payment.save();
            order.payment_status = "paid";
            await order.save();
            res.status(200).json({ message: 'Order verified and payment updated successfully' });
        } else {
            res.status(400).json({ message: 'Invalid signature' });
        }
        
    }
    catch(error){
        console.error('Error verifying order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const orderWebhook = async (req, res) => {
    try{
        
    }
    catch(error){
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const getPaymentHistory = async (req, res) => {
    try{
        const payments = await Payment.find({order_id: req.params.order_id});
        if (!payments) {
            return res.status(404).json({ message: 'No payment history found for this order' });
        }
        res.status(200).json({ payments });
    }
    catch(error){
        res.status(500).json({ message: 'Internal server error' });
    }
}