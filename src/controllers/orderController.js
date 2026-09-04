import {Order} from "../models/ordersModel.js";
import {Menu_item} from "../models/menuModel.js";
import {User} from "../models/userModel.js";
import {Restaurant} from "../models/restaurantModel.js";
import {Cart_items} from "../models/cartModel.js";
import { razorpayInstance } from "../config/razorpayConfig.js";
import { Payment } from "../models/paymentModel.js";
import { notifyOwner } from "../services/ownerNotificationService.js";
import mongoose from "mongoose";

export const createOrder = async (req, res) => {
    try {
        const user_id = req.user._id;
        const { cartId, payment_method, address, phone } = req.body;

        // Validate payment method
        if (!["online", "cod"].includes(payment_method)) {
            return res.status(400).json({
                message: "Invalid payment method"
            });
        }

        // Fetch cart details
        const cart = await Cart_items
            .findById(cartId)
            .populate("menu.menu_item_id");

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            });
        }

        // Check cart belongs to logged-in user
        if (cart.user_id.toString() !== user_id.toString()) {
            return res.status(403).json({
                message: "You are not authorized to use this cart"
            });
        }

        // Check cart is not empty
        if (!cart.menu || cart.menu.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        // Check if any menu item is missing after populate
        const invalidItem = cart.menu.find(
            item => !item.menu_item_id
        );

        if (invalidItem) {
            return res.status(400).json({
                message: "One or more menu items are no longer available"
            });
        }

        // Create order items
        const orderItems = cart.menu.map(item => ({
            menu_item_id: item.menu_item_id._id,
            name: item.menu_item_id.name,
            quantity: item.quantity,
            price: item.menu_item_id.price
        }));

        // Calculate subtotal, platform fee, delivery fee and total
        const subtotal = orderItems.reduce(
            (total, item) =>
                total + (item.quantity * item.price),
            0
        );

        const platform_fee = 11;
        const delivery_fee = 21;
        const total = subtotal + platform_fee + delivery_fee;

        // Get user
        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Get restaurant
        const restaurant = await Restaurant.findById(cart.res_id);

        if (!restaurant) {
            return res.status(404).json({
                message: "Restaurant not found"
            });
        }

        // Common order options
        const orderOptions = {
            user_id: user_id,
            res_id: cart.res_id,
            items: orderItems,
            subtotal: subtotal,
            platform_fee: platform_fee,
            delivery_fee: delivery_fee,
            total_amount: total,
            order_status: "pending",
            delivery_address: address || user.address,
            estimated_delivery_time: new Date(
                Date.now() + 40 * 60 * 1000
            )
        };

        // =========================================================
        // ONLINE PAYMENT
        // =========================================================

        if (payment_method === "online") {

            // Create Razorpay order FIRST
            const razorpayOptions = {
                amount: Math.round(total * 100),
                currency: "INR",
                receipt: `receipt_${Date.now()}`
            };

            const razorpayOrder =
                await razorpayInstance.orders.create(
                    razorpayOptions
                );

            // Create Foody order
            const order = new Order({
                ...orderOptions,
                payment_method: "online",
                payment_status: "pending"
            });

            await order.save();

            // Add order to user's orders
            user.orders.push(order._id);
            await user.save();

            // Add order to restaurant's orders
            restaurant.orders.push(order._id);
            await restaurant.save();

            // Notify restaurant
            await notifyOwner(
                order._id,
                user.name,
                restaurant.r_name,
                phone,
                address,
                order
            );

            // Send Razorpay order details to frontend
            return res.status(201).json({
                message: "Razorpay order created",
                orderId: order._id,
                razorpayOrder: razorpayOrder
            });
        }

        // =========================================================
        // CASH ON DELIVERY
        // =========================================================

        if (payment_method === "cod") {

            // Create Foody order
            const order = new Order({
                ...orderOptions,
                payment_method: "cod",
                payment_status: "pending"
            });

            await order.save();

            // Create COD payment record
            await Payment.create({
                order_id: order._id,
                payment_method: "cod",
                amount: total,
                payment_order_id: `COD_${Date.now()}`,
                transaction_id: `COD_${Date.now()}`,
                payment_status: "pending"
            });

            // Add order to user's orders
            user.orders.push(order._id);
            await user.save();

            // Add order to restaurant's orders
            restaurant.orders.push(order._id);
            await restaurant.save();

            // Notify restaurant
            await notifyOwner(
                order._id,
                user.name,
                restaurant.r_name,
                phone,
                address,
                order
            );

            return res.status(201).json({
                message: "Order placed successfully",
                orderId: order._id
            });
        }

    } catch (error) {
        console.error("Create order error:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};


export const getAllOrders = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // ====================== CUSTOMER ======================
    if (user.role === "customer") {
      const orders = await Order.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(user._id),
          },
        },

        {
          $lookup: {
            from: "restaurants",
            localField: "res_id",
            foreignField: "_id",
            as: "restaurant",
          },
        },

        {
          $lookup: {
            from: "menu_items",
            localField: "items.menu_item_id",
            foreignField: "_id",
            as: "menuItems",
          },
        },

        {
          $project: {
            _id: 1,

            restaurantName: {
              $first: "$restaurant.r_name",
            },

            restaurantId: "$res_id",

            items: {
              $map: {
                input: "$items",
                as: "item",
                in: {
                  restaurantId: "$res_id",

                  menu_item_id: "$$item.menu_item_id",

                  quantity: "$$item.quantity",

                  price: "$$item.price",

                  name: {
                    $let: {
                      vars: {
                        menu: {
                          $first: {
                            $filter: {
                              input: "$menuItems",
                              as: "m",
                              cond: {
                                $eq: [
                                  "$$m._id",
                                  "$$item.menu_item_id",
                                ],
                              },
                            },
                          },
                        },
                      },
                      in: "$$menu.name",
                    },
                  },
                },
              },
            },

            subtotal: 1,

            deliveryFee: "$delivery_fee",

            platformFee: "$platform_fee",

            total: "$total_amount",

            status: "$order_status",

            payment_status: 1,

            payment_method: 1,

            address: "$delivery_address",

            createdAt: 1,
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      return res.status(200).json(orders);
    }

    // ====================== RESTAURANT OWNER ======================
    if (user.role === "admin") {
      const restaurant = await Restaurant.findOne({
        owner_id: user._id,
      });

      if (!restaurant) {
        return res.status(404).json({
          message: "Restaurant not found",
        });
      }

      const orders = await Order.aggregate([
        {
          $match: {
            res_id: restaurant._id,
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },

        {
          $lookup: {
            from: "menu_items",
            localField: "items.menu_item_id",
            foreignField: "_id",
            as: "menuItems",
          },
        },

        {
          $project: {
            _id: 1,

            customerName: {
              $first: "$customer.name",
            },

            customerPhone: {
              $first: "$customer.phone",
            },

            items: {
              $map: {
                input: "$items",
                as: "item",
                in: {
                  menu_item_id: "$$item.menu_item_id",

                  quantity: "$$item.quantity",

                  price: "$$item.price",

                  name: {
                    $let: {
                      vars: {
                        menu: {
                          $first: {
                            $filter: {
                              input: "$menuItems",
                              as: "m",
                              cond: {
                                $eq: [
                                  "$$m._id",
                                  "$$item.menu_item_id",
                                ],
                              },
                            },
                          },
                        },
                      },
                      in: "$$menu.name",
                    },
                  },
                },
              },
            },

            subtotal: 1,

            deliveryFee: "$delivery_fee",

            platformFee: "$platform_fee",

            total: "$total_amount",

            status: "$order_status",

            payment_status: 1,

            payment_method: 1,

            address: "$delivery_address",

            createdAt: 1,

            estimated_delivery_time: 1,
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      return res.status(200).json(orders);
    }

    return res.status(403).json({
      message: "Access denied",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


export const getOrderById = async (req, res) => {
    try {
            const user = req.user;
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
                    }},
                    {
                        $project:{
                            menu_items:1,
                            payment_status:1,
                            customer_name:1,
                            order_status:1,
                            delivery_partner_name:1,
                            delivery_partner_contact:1,
                            subtotal:1,
                        }
                    }
                ])
                if (!order.length) {
  return res.status(404).json({
    message: "Order not found",
  });
}

return res.status(200).json(order[0]);
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
        res.status(500).json({ message: error.message });
    }   
};


export const getAssignedOrders = async (req, res) => {
    try {
        const user = req.user._id;
        if(!user){
            return res.status(404).json({ message: "User not found" });
        }
        const deliveryPartner = await User.findById(user);
        if(!deliveryPartner || deliveryPartner.role !== "deliveryPerson"){
            return res.status(403).json({ message: "You are not authorized to view assigned orders" });
        }
        const assignedOrders = await Order.find({ d_partner_id: user });
        if(!assignedOrders?.length) return res.status(404).json({message:"No assigned orders found"});
        res.status(200).json(assignedOrders);
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
};


export const updateDeliveryStatus = async (req, res) => {
    try {
        
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};





