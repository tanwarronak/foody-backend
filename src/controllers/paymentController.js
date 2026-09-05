import {razorpayInstance} from "../config/razorpayConfig.js";
import {Order} from "../models/ordersModel.js";
import crypto from "crypto";
import {Payment} from "../models/paymentModel.js";

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

        // Validate Razorpay response
        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                message: "Invalid Razorpay payment response"
            });
        }

        // =========================================================
        // VERIFY RAZORPAY SIGNATURE
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

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                message: "Invalid payment signature"
            });
        }

        // =========================================================
        // FETCH CART AGAIN
        // =========================================================

        const cart = await Cart_items
            .findById(cartId)
            .populate("menu.menu_item_id");

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            });
        }

        // Make sure cart belongs to logged-in user
        if (cart.user_id.toString() !== user_id.toString()) {
            return res.status(403).json({
                message: "You are not authorized to use this cart"
            });
        }

        // Check cart
        if (!cart.menu || cart.menu.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        // Check menu items
        const invalidItem = cart.menu.find(
            item => !item.menu_item_id
        );

        if (invalidItem) {
            return res.status(400).json({
                message: "One or more menu items are no longer available"
            });
        }

        // =========================================================
        // GET USER
        // =========================================================

        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // =========================================================
        // GET RESTAURANT
        // =========================================================

        const restaurant = await Restaurant.findById(cart.res_id);

        if (!restaurant) {
            return res.status(404).json({
                message: "Restaurant not found"
            });
        }

        // =========================================================
        // CREATE ORDER ITEMS
        // =========================================================

        const orderItems = cart.menu.map(item => ({
            menu_item_id: item.menu_item_id._id,
            name: item.menu_item_id.name,
            quantity: item.quantity,
            price: item.menu_item_id.price
        }));

        // =========================================================
        // CALCULATE TOTAL
        // =========================================================

        const subtotal = orderItems.reduce(
            (total, item) =>
                total + (item.quantity * item.price),
            0
        );

        const platform_fee = 11;
        const delivery_fee = 21;
        const total = subtotal + platform_fee + delivery_fee;

        // =========================================================
        // CREATE FOODY ORDER
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

            delivery_address: address || user.address,

            estimated_delivery_time: new Date(
                Date.now() + 40 * 60 * 1000
            )
        });

        await order.save();

        // =========================================================
        // CREATE PAYMENT RECORD
        // =========================================================

        await Payment.create({
            payment_order_id: razorpay_order_id,
            order_id: order._id,
            payment_method: "online",
            amount: total,
            payment_status: "paid",
            transaction_id: razorpay_payment_id,
            paid_at: new Date()
        });

        // =========================================================
        // ADD ORDER TO USER
        // =========================================================

        user.orders.push(order._id);
        await user.save();

        // =========================================================
        // ADD ORDER TO RESTAURANT
        // =========================================================

        restaurant.orders.push(order._id);
        await restaurant.save();

        // =========================================================
        // NOTIFY RESTAURANT
        // =========================================================

        await notifyOwner(
            order._id,
            user.name,
            restaurant.r_name,
            phone,
            address,
            order
        );

        // =========================================================
        // SUCCESS
        // =========================================================

        return res.status(200).json({
            message: "Payment verified and order created successfully",
            verified: true,
            orderId: order._id
        });

    } catch (error) {

        console.error(
            "Error verifying order:",
            error
        );

        return res.status(500).json({
            message: "Internal server error"
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