import { razorpayInstance } from "../config/razorpayConfig.js";
import { Payment } from "../models/paymentModel.js";
import { Order } from "../models/ordersModel.js";
import crypto from "crypto";

export const verifyOrder = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // =========================================================
        // 1. VALIDATE RAZORPAY RESPONSE
        // =========================================================

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                verified: false,
                message:
                    "Invalid Razorpay payment response"
            });
        }

        // =========================================================
        // 2. VERIFY RAZORPAY SIGNATURE
        // =========================================================

        const body =
            razorpay_order_id +
            "|" +
            razorpay_payment_id;

        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(body)
                .digest("hex");

        if (
            expectedSignature !==
            razorpay_signature
        ) {
            return res.status(400).json({
                verified: false,
                message:
                    "Invalid payment signature"
            });
        }

        // =========================================================
        // 3. FETCH RAZORPAY PAYMENT
        // =========================================================

        const razorpayPayment =
            await razorpayInstance.payments.fetch(
                razorpay_payment_id
            );

        if (!razorpayPayment) {
            return res.status(404).json({
                verified: false,
                message:
                    "Razorpay payment not found"
            });
        }

        // =========================================================
        // 4. VERIFY PAYMENT BELONGS TO RAZORPAY ORDER
        // =========================================================

        if (
            razorpayPayment.order_id !==
            razorpay_order_id
        ) {
            return res.status(400).json({
                verified: false,
                message:
                    "Payment does not belong to this Razorpay order"
            });
        }

        // =========================================================
        // 5. VERIFY PAYMENT STATUS
        // =========================================================

        if (
            razorpayPayment.status !==
            "captured"
        ) {
            return res.status(400).json({
                verified: false,
                message:
                    `Payment is not captured. Current status: ${razorpayPayment.status}`
            });
        }

        // =========================================================
        // 6. FIND PAYMENT RECORD
        // =========================================================

        const payment =
            await Payment.findOne({
                payment_order_id:
                    razorpay_order_id
            });

        if (!payment) {
            return res.status(404).json({
                verified: false,
                message:
                    "Payment record not found"
            });
        }

        // =========================================================
        // 7. CHECK IF ALREADY VERIFIED
        // =========================================================

        if (
            payment.payment_status ===
            "paid"
        ) {
            return res.status(200).json({
                verified: true,
                message:
                    "Payment already verified",
                razorpay_order_id,
                razorpay_payment_id,
                orderId:
                    payment.order_id
            });
        }

        // =========================================================
        // 8. VERIFY PAYMENT AMOUNT
        // =========================================================

        const expectedAmount =
            Math.round(
                Number(payment.amount) * 100
            );

        if (
            Number(razorpayPayment.amount) !==
            expectedAmount
        ) {
            return res.status(400).json({
                verified: false,
                message:
                    "Payment amount does not match order amount"
            });
        }

        // =========================================================
        // 9. UPDATE PAYMENT RECORD
        // =========================================================

        payment.transaction_id =
            razorpay_payment_id;

        payment.payment_status =
            "paid";

        payment.paid_at =
            new Date();

        await payment.save();

        // =========================================================
        // 10. UPDATE FOODY ORDER
        // =========================================================

        const order =
            await Order.findById(
                payment.order_id
            );

        if (!order) {
            return res.status(404).json({
                verified: false,
                message:
                    "Foody order not found"
            });
        }

        order.payment_status =
            "paid";

        await order.save();

        // =========================================================
        // 11. SUCCESS
        // =========================================================

        return res.status(200).json({
            verified: true,

            message:
                "Payment verified successfully",

            razorpay_order_id,

            razorpay_payment_id,

            orderId:
                order._id
        });

    } catch (error) {

        console.error(
            "Error verifying Razorpay payment:",
            error
        );

        return res.status(500).json({
            verified: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Internal server error"
        });
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
    try {
        const payments = await Payment.find({
            order_id: req.params.order_id
        });

        if (payments.length === 0) {
            return res.status(404).json({
                message: "No payment history found for this order"
            });
        }

        return res.status(200).json({
            payments
        });

    } catch (error) {
        console.error(
            "Error getting payment history:",
            error
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};