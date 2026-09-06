    import { razorpayInstance } from "../config/razorpayConfig.js";
    import { Payment } from "../models/paymentModel.js";
    import crypto from "crypto";

export const verifyOrder = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
            } = req.body;


        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                verified: false,
                message: "Invalid Razorpay payment response"
            });
        }

        // =========================================================
        // 2. VERIFY RAZORPAY SIGNATURE
        // =========================================================

        const body =
            razorpay_order_id +
            "|" +
            razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                verified: false,
                message: "Invalid payment signature"
            });
        }

        // =========================================================
        // 3. FETCH RAZORPAY PAYMENT
        // =========================================================

        const payment =
            await razorpayInstance.payments.fetch(
                razorpay_payment_id
            );

        if (!payment) {
            return res.status(404).json({
                verified: false,
                message: "Razorpay payment not found"
            });
        }

        // =========================================================
        // 4. VERIFY PAYMENT BELONGS TO THE RAZORPAY ORDER
        // =========================================================

        if (
            payment.order_id !==
            razorpay_order_id
        ) {
            return res.status(400).json({
                verified: false,
                message: "Payment does not belong to this order"
            });
        }

        // =========================================================
        // 5. VERIFY PAYMENT STATUS
        // =========================================================

        if (payment.status !== "captured") {
            return res.status(400).json({
                verified: false,
                message:
                    `Payment is not captured. Current status: ${payment.status}`
            });
        }

        // =========================================================
        // 6. SUCCESS
        // =========================================================

        return res.status(200).json({
            verified: true,

            message: "Payment verified successfully",

            razorpay_order_id,
            razorpay_payment_id
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