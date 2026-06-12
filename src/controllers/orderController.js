import {Order} from "../models/ordersModel.js";
import {Menu_item} from "../models/menuModel.js";
import {User} from "../models/userModel.js";
import {Restaurant} from "../models/restaurantModel.js";
import {Cart_items} from "../models/cartModel.js";

export const createOrder = async (req, res) => {
    try {
        const user_id = req.user._id;
        const { cartId } = req.body;
        
        // fetch cart details
        const cart = await Cart_items.findById(cartId).populate('menu.menu_item_id');
        if(!cart || cart.user_id.toString() !== user_id.toString()){
            return res.status(404).json({ message: "Cart not found" });
        };

        // create order
        const orderItems = cart.menu.map(item => ({
            menu_item_id: item.menu_item_id._id,
            quantity: item.quantity,
            price: item.menu_item_id.price
        }));

        // calculate subtotal, platform_fee, delivery_fee and total
        let subtotal = orderItems.reduce((total, item)=> total + (item.quantity * item.price), 0);
        let platform_fee = 10;
        let delivery_fee = subtotal*0.1;
        let total = subtotal + platform_fee + delivery_fee;

        // check if order is already placed for the same cart
        const user = await User.findById(user_id);
        const existingOrder = user.orders.filter(orderId => orderId.toString() === cartId.toString());

        if (existingOrder) {
            return res.status(400).json({ message: "Order for this cart already exists" });
        }

        const order = new Order({
            user_id: user_id,
            res_id:cart.res_id,
            items: orderItems,
            subtotal: subtotal,
            platform_fee: platform_fee,
            delivery_fee: delivery_fee,
            total_amount: total,
            order_status: "pending",
            payment_status: "pending",
            delivery_address: user.address, // may need to change it
            estimated_delivery_time: new Date(Date.now() + 40*60*1000) // 30 mins from now
        });
        await order.save();
        // Add order to user's orders list
        user.orders.push(order._id);
        await user.save();
        // Add order to restaurant's orders list
        const restaurant = await Restaurant.findById(cart.res_id);
        restaurant.orders.push(order._id);
        await restaurant.save();
        res.status(200).json({ message: "Order placed successfully"});
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
};


export const getAllOrders = async (req, res) => {
    try {
            const user = req.user._id;
            if(!user){
                return res.status(404).json({ message: "User not found" });
            }
            if(user.role === "customer"){
                const orders = await Order.find({user_id:user._id}).populate('res_id').populate('items.menu_item_id');
                return res.status(200).json({ orders });
            }
            if(user.role === "admin"){
                const orders = await Restaurant.find({ owner_id: user._id }).populate('orders').populate('orders.user_id').populate('orders.items.menu_item_id');
                return res.status(200).json({ orders });
            }
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
};

export const getOrderById = async (req, res) => {
    try {

    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }   
};

export const updateOrderStatus = async (req, res) => {
    try {

    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }   
};

export const getAssignedOrders = async (req, res) => {
    try {

    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateDeliveryStatus = async (req, res) => {
    try {

    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};