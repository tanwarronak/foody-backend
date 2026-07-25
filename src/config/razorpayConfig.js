import Razorpay from "razorpay";

export const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_T7200VpjRKi6AF",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "o9Ld3JPvuSpz01djlJ24CSD5"
});