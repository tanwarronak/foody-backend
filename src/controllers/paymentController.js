import { razorpayInstance } from "../config/razorpayConfig.js";
import { Order } from "../models/ordersModel.js";
import { Payment } from "../models/paymentModel.js";
import { Cart_items } from "../models/cartModel.js";
import { User } from "../models/userModel.js";
import { Restaurant } from "../models/restaurantModel.js";
import { notifyOwner } from "../services/ownerNotificationService.js";
import crypto from "crypto";

export const verifyOrder = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            cartId,
            address,
            phone
        } = req.body;

        const user_id = req.user._id;

        // =========================================================
        // 1. VALIDATE REQUEST
        // =========================================================

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !cartId
        ) {
            return res.status(400).json({
                message: "Invalid payment verification data"
            });
        }

        // =========================================================
        // 2. CHECK IF PAYMENT WAS ALREADY PROCESSED
        // =========================================================

        const existingPayment = await Payment.findOne({
            transaction_id: razorpay_payment_id
        });

        if (existingPayment) {
            return res.status(200).json({
                message: "Payment already processed",
                verified: true,
                orderId: existingPayment.order_id
            });
        }

        // =========================================================
        // 3. VERIFY RAZORPAY SIGNATURE
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

        if (
            !crypto.timingSafeEqual(
                Buffer.from(expectedSignature),
                Buffer.from(razorpay_signature)
            )
        ) {
            return res.status(400).json({
                message: "Invalid payment signature",
                verified: false
            });
        }

        // =========================================================
        // 4. FETCH RAZORPAY ORDER
        // =========================================================

        const razorpayOrder =
            await razorpayInstance.orders.fetch(
                razorpay_order_id
            );

        if (!razorpayOrder) {
            return res.status(404).json({
                message: "Razorpay order not found",
                verified: false
            });
        }

        // =========================================================
        // 5. FETCH CART
        // =========================================================

        const cart = await Cart_items
            .findById(cartId)
            .populate("menu.menu_item_id");

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found",
                verified: false
            });
        }

        // =========================================================
        // 6. VERIFY CART OWNERSHIP
        // =========================================================

        if (
            cart.user_id.toString() !==
            user_id.toString()
        ) {
            return res.status(403).json({
                message: "You are not authorized to use this cart",
                verified: false
            });
        }

        // =========================================================
        // 7. VALIDATE CART
        // =========================================================

        if (!cart.menu || cart.menu.length === 0) {
            return res.status(400).json({
                message: "Cart is empty",
                verified: false
            });
        }

        const invalidItem = cart.menu.find(
            item => !item.menu_item_id
        );

        if (invalidItem) {
            return res.status(400).json({
                message:
                    "One or more menu items are no longer available",
                verified: false
            });
        }

        // =========================================================
        // 8. GET USER
        // =========================================================

        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                verified: false
            });
        }

        // =========================================================
        // 9. GET RESTAURANT
        // =========================================================

        const restaurant = await Restaurant.findById(
            cart.res_id
        );

        if (!restaurant) {
            return res.status(404).json({
                message: "Restaurant not found",
                verified: false
            });
        }

        // =========================================================
        // 10. CREATE ORDER ITEMS
        // =========================================================

        const orderItems = cart.menu.map(item => ({
            menu_item_id: item.menu_item_id._id,
            name: item.menu_item_id.name,
            quantity: item.quantity,
            price: item.menu_item_id.price
        }));

        // =========================================================
        // 11. CALCULATE TOTAL
        // =========================================================

        const subtotal = orderItems.reduce(
            (total, item) =>
                total +
                item.quantity * item.price,
            0
        );

        const platform_fee = 11;
        const delivery_fee = 21;

        const total =
            subtotal +
            platform_fee +
            delivery_fee;

        // =========================================================
        // 12. VERIFY RAZORPAY AMOUNT
        // =========================================================

        const expectedAmount = Math.round(
            total * 100
        );

        if (
            Number(razorpayOrder.amount) !==
            expectedAmount
        ) {
            console.error(
                "Payment amount mismatch:",
                {
                    razorpayAmount:
                        razorpayOrder.amount,
                    expectedAmount
                }
            );

            return res.status(400).json({
                message: "Payment amount mismatch",
                verified: false
            });
        }

        // =========================================================
        // 13. VERIFY RAZORPAY ORDER STATUS
        // =========================================================

        if (
            razorpayOrder.status !== "paid" &&
            razorpayOrder.status !== "attempted"
        ) {
            return res.status(400).json({
                message: "Razorpay order has not been paid",
                verified: false
            });
        }

        // =========================================================
        // 14. CREATE FOODY ORDER
        // =========================================================

        const order = new Order({
            user_id: user_id,
            res_id: cart.res_id,

            items: orderItems,

            order_status: "pending",

            payment_status: "paid",
            payment_method: "online",

            subtotal: subtotal,
            platform_fee: platform_fee,
            delivery_fee: delivery_fee,
            total_amount: total,

            delivery_address:
                address || user.address,

            estimated_delivery_time:
                new Date(
                    Date.now() +
                    40 * 60 * 1000
                )
        });

        await order.save();

        // =========================================================
        // 15. CREATE PAYMENT RECORD
        // =========================================================

        await Payment.create({
            payment_order_id:
                razorpay_order_id,

            order_id:
                order._id,

            payment_method:
                "online",

            amount:
                total,

            payment_status:
                "paid",

            transaction_id:
                razorpay_payment_id,

            paid_at:
                new Date()
        });

        // =========================================================
        // 16. ADD ORDER TO USER
        // =========================================================

        user.orders.push(order._id);

        await user.save();

        // =========================================================
        // 17. ADD ORDER TO RESTAURANT
        // =========================================================

        restaurant.orders.push(order._id);

        await restaurant.save();

        // =========================================================
        // 18. NOTIFY RESTAURANT
        // =========================================================

        try {
            await notifyOwner(
                order._id,
                user.name,
                restaurant.r_name,
                phone,
                address,
                order
            );
        } catch (notificationError) {
            // IMPORTANT:
            // Notification failure should NOT make
            // an already-created order look like
            // a failed payment.

            console.error(
                "Order created but owner notification failed:",
                notificationError
            );
        }

        // =========================================================
        // 19. SUCCESS
        // =========================================================

        return res.status(200).json({
            message:
                "Payment verified and order created successfully",

            verified: true,

            orderId: order._id
        });

    } catch (error) {
        console.error(
            "Error verifying order:",
            error
        );

        return res.status(500).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Internal server error",

            verified: false
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