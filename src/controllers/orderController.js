import {Order} from "../models/ordersModel.js";
import {Menu_item} from "../models/menuModel.js";
import {User} from "../models/userModel.js";
import {Restaurant} from "../models/restaurantModel.js";
import {Cart_items} from "../models/cartModel.js";
import mongoose from "mongoose";

export const createOrder = async (req, res) => {
    try {
        const user_id = req.user._id;
        const { cartId } = req.body;
        
        // fetch cart details
        const cart = await Cart_items.findById(cartId).populate('menu.menu_item_id');
        if(!cart || cart.user_id.toString() !== user_id.toString()){
            return res.status(404).json({ message: "Cart not found" });
        }; // this portion is giving errors frequently, need to check it once again

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

        if (existingOrder?.length > 0) {
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
        res.status(500).json({ message:"Internal server error" });
    }
};


export const getAllOrders = async (req, res) => {
    try {
            const user = req.user._id;
            if(!user){
                return res.status(404).json({ message: "User not found" });
            }
            if(user.role === "customer"){
                const orders = await Order.aggregate([
                    {
                        $match:{user_id: new mongoose.Types.ObjectId(user._id)}
                    },
                    {
                        $lookup:{
                            from:"restaurants",
                            localField:"res_id",
                            foreignField:"_id",
                            as:"restaurant"
                        }
                    },
                    {
                        $addFields:{
                            restaurant_name:{
                                $first:"$restaurant.r_name"
                            },
                            restaurant_description:{
                                $first:"$restaurant.description"
                            },
                            restaurant_contact:{
                                $first:"$restaurant.phone"
                            },
                        }
                    },
                    {
                        $project:{
                            user_id:1,
                            items:1,
                            order_status:1,
                            restaurant_name:1,
                            total_amount:1,
                        }
                    }
                ]);
                if(!orders?.length) return res.status(404).json({message:"oreders not found"})
                return res.status(200).json(orders);
                
            } 
            if(user.role === "admin"){
                const restuarant = await Restaurant.findOne({owner_id: user._id});
                if(!restuarant) return res.status(404).json({message:"Restaurant not found"});
                const res_id = restuarant._id;
                const orders = await Order.aggregate([
                    {
                        $match:{res_id: new mongoose.Types.ObjectId(res_id)}
                    },
                    {
                         $lookup:{
                            from:"menu_items",
                            localField:"items.menu_item_id",
                            foreignField:"_id",
                            as:"menu_items"
                        }
                    },
                    {
                        $addFields:{
                            items:{
                                $map:{
                                    input:"$menu_items",
                                    as:"item",
                                    in:{
                                        menu_item_id:"$$item.name",
                                        quantity:"$$item.quantity",
                                        price:"$$item.price"
                                }
                            }
                        }
                    }},
                    {
                        $project:{
                            items:1,
                            order_status:1,
                            subtotal:1,
                        }
                    }
                ]);
                if(!orders?.length) return res.status(404).json({message:"oreders not found"})
                res.status(200).json(orders);
            }
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getOrderById = async (req, res) => {
    try {
            const user = req.user._id;
            const orderId = req.params.id;
            if(!user){
                return res.status(404).json({ message: "User not found" });
            }
            if(user.role === "customer"){
                const order = await Order.aggregate([
                    {
                        $match:{_id: new mongoose.Types.ObjectId(orderId)}
                    },
                    {
                        $lookup:{
                            from:"restaurants",
                            localField:"res_id",
                            foreignField:"_id",
                            as:"restaurant"
                        }
                    },
                    {
                        $lookup:{
                            from:"menu_items",
                            localField:"items.menu_item_id",
                            foreignField:"_id",
                            as:"menu_items"
                        }
                    },
                    {
                        $addFields:{
                            restaurant_name:{
                                $first:"$restaurant.r_name"
                            },
                            restaurant_description:{
                                $first:"$restaurant.description"
                            },
                            restaurant_contact:{
                                $first:"$restaurant.phone"
                            },
                            menu_items:{
                                $map:{
                                    input:"$menu_items",
                                    as:"menu_item",
                                    in:{
                                        name:"$$menu_item.name",
                                        description:"$$menu_item.description",
                                        price:"$$menu_item.price",
                                        category:"$$menu_item.category",
                                    
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project:{
                            user_id:1,
                            menu_items:1,
                            order_status:1,
                            payment_status:1,
                            restaurant_name:1,
                            restaurant_description:1,
                            restaurant_contact:1,
                            subtotal:1,
                            delivery_fee:1,
                            platform_fee:1,
                            total_amount:1,
                        }
                    }
                ]);
                if(!order) return res.status(404).json({message:"order not found"})
                return res.status(200).json(order);
                
            } 
            if(user.role === "admin"){
                const orders = await Order.aggregate([
                    {
                        $match:{_id: new mongoose.Types.ObjectId(orderId)}
                    },
                    {
                        $lookup:{
                            from:"users",
                            localField:"d_partner_id",
                            foreignField:"_id",
                            as:"delivery_partner"
                        }
                    },
                    {
                        $lookup:{
                            from:"users",
                            localField:"user_id",
                            foreignField:"_id",
                            as:"customer"
                        }
                    },
                    {
                         $lookup:{
                            from:"menu_items",
                            localField:"items.menu_item_id",
                            foreignField:"_id",
                            as:"menu_items"
                        }
                    },
                    {
                        $addFields:{
                            delivery_partner_name:{
                                $first:"$delivery_partner.name"
                            },
                            delivery_partner_contact:{
                                $first:"$delivery_partner.phone"
                            },
                            customer_name:{
                                $first:"$customer.name"
                            },
                            items:{
                                $map:{
                                    input:"$menu_items",
                                    as:"item",
                                    in:{
                                        menu_item_id:"$$item.name",
                                        quantity:"$$item.quantity",
                                        price:"$$item.price"
                                }
                            }
                        }
                    }},
                    {
                        $project:{
                            items:1,
                            payment_status:1,
                            customer_name:1,
                            order_status:1,
                            delivery_partner_name:1,
                            delivery_partner_contact:1,
                            subtotal:1,
                        }
                    }
                ])
                if(!order) return res.status(404).json({message:"order not found"})
                res.status(200).json(order);
            }
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }   
};

export const updateOrderStatus = async (req, res) => {
    try {
            const orderId = req.params.id;
            const userId = req.user._id;
            const newStatus = req.body.order_status;
            const restaurant = await Restaurant.findOne({owner_id: userId});
            if(!restaurant) return res.status(404).json({message:"Restaurant not found"});
            const res_id = restaurant._id;
            const order = await Order.findById(orderId);
            if(!order) return res.status(404).json({message:"Order not found"});
            if(order.res_id.toString() !== res_id.toString()){
                return res.status(403).json({message:"You are not authorized to update this order"});
            }
            const validTransitions = {
        pending: ["accepted", "cancelled"],
        accepted: ["preparing", "cancelled"],
        preparing: ["ready for pickup"],
        "ready for pickup": ["out for delivery"],
        "out for delivery": ["delivered"],
        delivered: [],
        cancelled: []
    };
            if(!validTransitions[order.order_status].includes(req.body.order_status)){
                return res.status(400).json({message:`Invalid order status transition from ${order.order_status} to ${newStatus}`});
            }
            order.order_status = newStatus;
            await order.save();
            res.status(200).json({message:"Order status updated successfully"});
    }
    catch(error){
        res.status(500).json({ message: "Internal server Error" });
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





