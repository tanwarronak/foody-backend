import { Order } from "../models/ordersModel.js";
import { User } from "../models/userModel.js";
import { Restaurant } from "../models/restaurantModel.js";
import { Cart_items } from "../models/cartModel.js";
import { razorpayInstance } from "../config/razorpayConfig.js";
import { Payment } from "../models/paymentModel.js";
import { notifyOwner } from "../services/ownerNotificationService.js";
import mongoose from "mongoose";
import { calculatePricing } from "../utils/pricing.js";
import { Coupon } from "../models/couponModel.js";
import { availableCouponFilter, couponDiscount } from "../utils/coupons.js";

export const createOrder = async (req, res) => {
    let reservedCoupon = null;
    let orderSaved = false;
    try {
        const user_id = req.user._id;
        const {
            cartId,
            payment_method,
            address,
            phone,
            coupon_code,
            expected_total
        } = req.body;

        // =========================================================
        // 1. VALIDATE PAYMENT METHOD
        // =========================================================

        if (!["online", "cod"].includes(payment_method)) {
            return res.status(400).json({
                message: "Invalid payment method"
            });
        }

        // =========================================================
        // 2. FETCH CART
        // =========================================================

        const cart = await Cart_items
            .findById(cartId)
            .populate("menu.menu_item_id");

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            });
        }

        // =========================================================
        // 3. CHECK CART OWNERSHIP
        // =========================================================

        if (
            cart.user_id.toString() !==
            user_id.toString()
        ) {
            return res.status(403).json({
                message:
                    "You are not authorized to use this cart"
            });
        }

        // =========================================================
        // 4. CHECK CART
        // =========================================================

        if (
            !cart.menu ||
            cart.menu.length === 0
        ) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        // =========================================================
        // 5. CHECK MENU ITEMS
        // =========================================================

        const invalidItem = cart.menu.find(
            item => !item.menu_item_id
        );

        if (invalidItem) {
            return res.status(400).json({
                message:
                    "One or more menu items are no longer available"
            });
        }

        // =========================================================
        // 6. GET USER
        // =========================================================

        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // =========================================================
        // 7. GET RESTAURANT
        // =========================================================

        const restaurant = await Restaurant.findById(
            cart.res_id
        );

        if (!restaurant) {
            return res.status(404).json({
                message: "Restaurant not found"
            });
        }

        if (!restaurant.is_open) {
            return res.status(400).json({ message: 'This restaurant is currently closed' });
        }

        // =========================================================
        // 8. CREATE ORDER ITEMS
        // =========================================================

        const orderItems = cart.menu.map(item => ({
            menu_item_id: item.menu_item_id._id,
            name: item.menu_item_id.name,
            quantity: item.quantity,
            price: item.menu_item_id.price
        }));

        // =========================================================
        // 9. CALCULATE TOTAL
        // =========================================================

        const subtotal = orderItems.reduce(
            (total, item) =>
                total +
                item.quantity * item.price,
            0
        );

        if (coupon_code !== undefined && (typeof coupon_code !== 'string' || !coupon_code.trim())) {
            return res.status(400).json({ message: 'Invalid coupon code' });
        }
        if (coupon_code) {
            reservedCoupon = await Coupon.findOneAndUpdate(
                availableCouponFilter(coupon_code), { $inc: { usage_count: 1 } }, { returnDocument: 'after' }
            );
            if (!reservedCoupon) return res.status(400).json({ message: 'Coupon is invalid, expired, or exhausted' });
        }
        const pricing = calculatePricing(subtotal, reservedCoupon ? couponDiscount(reservedCoupon, subtotal) : 0);
        const platform_fee = pricing.platformFee;
        const delivery_fee = pricing.deliveryFee;
        const service_fee = pricing.serviceFee;
        const discount = pricing.discount;
        const total = pricing.total;

        if (expected_total !== undefined && (typeof expected_total !== 'number' || Math.abs(expected_total - total) > 0.001)) {
            if (reservedCoupon) await Coupon.updateOne({ _id: reservedCoupon._id }, { $inc: { usage_count: -1 } });
            reservedCoupon = null;
            return res.status(409).json({ message: 'Your cart or coupon has changed. Refresh checkout and try again.' });
        }

        // =========================================================
        // 10. ONLINE PAYMENT
        // =========================================================

        if (payment_method === "online") {

            // -----------------------------------------------------
            // CREATE RAZORPAY ORDER
            // -----------------------------------------------------

            const razorpayOptions = {
                amount: Math.round(total * 100),
                currency: "INR",
                receipt: `receipt_${Date.now()}`
            };

            const razorpayOrder =
                await razorpayInstance.orders.create(
                    razorpayOptions
                );

            // -----------------------------------------------------
            // CREATE FOODY ORDER
            //
            // Payment has not happened yet.
            // -----------------------------------------------------

            const order = new Order({
                user_id,

                res_id: cart.res_id,

                items: orderItems,

                order_status: "pending",

                payment_method: "online",

                payment_status: "pending",

                subtotal,

                platform_fee,

                delivery_fee,

                service_fee,
                discount,
                coupon_code: reservedCoupon?.code ?? null,

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
            orderSaved = true;

            // -----------------------------------------------------
            // CREATE PAYMENT RECORD
            // -----------------------------------------------------

            await Payment.create({
                payment_order_id:
                    razorpayOrder.id,

                order_id:
                    order._id,

                payment_method:
                    "online",

                amount:
                    total,

                payment_status:
                    "pending"
            });

            // -----------------------------------------------------
            // ADD ORDER TO USER
            // -----------------------------------------------------

            user.orders.push(order._id);

            await user.save();

            // -----------------------------------------------------
            // ADD ORDER TO RESTAURANT
            // -----------------------------------------------------

            restaurant.orders.push(order._id);

            await restaurant.save();

            // -----------------------------------------------------
            // NOTIFY RESTAURANT
            // -----------------------------------------------------

            try {
                await notifyOwner(
                    order._id,
                    user.name,
                    restaurant.r_name,
                    phone || user.phone,
                    address || user.address,
                    order
                );
            } catch (notificationError) {
                console.error(
                    "Order created but owner notification failed:",
                    notificationError
                );
            }

            // -----------------------------------------------------
            // RESPONSE
            // -----------------------------------------------------

            return res.status(201).json({
                message:
                    "Razorpay order and Foody order created",

                orderId:
                    order._id,

                pricing,

                razorpayOrder: {
                    id:
                        razorpayOrder.id,

                    amount:
                        razorpayOrder.amount,

                    currency:
                        razorpayOrder.currency,

                    receipt:
                        razorpayOrder.receipt
                }
            });
        }

        // =========================================================
        // 11. CASH ON DELIVERY
        // =========================================================

        if (payment_method === "cod") {

            const order = new Order({
                user_id,

                res_id: cart.res_id,

                items: orderItems,

                subtotal,

                platform_fee,

                delivery_fee,

                service_fee,
                discount,
                coupon_code: reservedCoupon?.code ?? null,

                total_amount: total,

                order_status: "pending",

                payment_method: "cod",

                payment_status: "pending",

                delivery_address:
                    address || user.address,

                estimated_delivery_time:
                    new Date(
                        Date.now() +
                        40 * 60 * 1000
                    )
            });

            await order.save();
            orderSaved = true;

            // -----------------------------------------------------
            // CREATE COD PAYMENT
            // -----------------------------------------------------

            const codId =
                `COD_${Date.now()}`;

            await Payment.create({
                order_id:
                    order._id,

                payment_method:
                    "cod",

                amount:
                    total,

                payment_order_id:
                    codId,

                transaction_id:
                    codId,

                payment_status:
                    "pending"
            });

            // -----------------------------------------------------
            // ADD ORDER TO USER
            // -----------------------------------------------------

            user.orders.push(order._id);

            await user.save();

            // -----------------------------------------------------
            // ADD ORDER TO RESTAURANT
            // -----------------------------------------------------

            restaurant.orders.push(order._id);

            await restaurant.save();

            // -----------------------------------------------------
            // NOTIFY RESTAURANT
            // -----------------------------------------------------

            try {
                await notifyOwner(
                    order._id,
                    user.name,
                    restaurant.r_name,
                    phone || user.phone,
                    address || user.address,
                    order
                );
            } catch (notificationError) {
                console.error(
                    "Order created but owner notification failed:",
                    notificationError
                );
            }

            // -----------------------------------------------------
            // RESPONSE
            // -----------------------------------------------------

            return res.status(201).json({
                message:
                    "Order placed successfully",

                orderId:
                    order._id,
                pricing
            });
        }

    } catch (error) {

        if (reservedCoupon && !orderSaved) {
            await Coupon.updateOne({ _id: reservedCoupon._id }, { $inc: { usage_count: -1 } }).catch(() => {});
        }

        console.error(
            "Create order error:",
            error
        );

        return res.status(500).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Internal server error"
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
                      in: { $ifNull: ["$$item.name", "$$menu.name"] },
                    },
                  },
                },
              },
            },

            subtotal: 1,

            deliveryFee: "$delivery_fee",

            platformFee: "$platform_fee",
            serviceFee: "$service_fee",
            discount: 1,
            couponCode: "$coupon_code",

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
      const orders = await Order.aggregate([
        { $lookup: { from: "restaurants", localField: "res_id", foreignField: "_id", as: "restaurant" } },

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

            restaurantName: { $first: "$restaurant.r_name" },
            restaurantId: "$res_id",

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
                      in: { $ifNull: ["$$item.name", "$$menu.name"] },
                    },
                  },
                },
              },
            },

            subtotal: 1,

            deliveryFee: "$delivery_fee",

            platformFee: "$platform_fee",
            serviceFee: "$service_fee",
            discount: 1,
            couponCode: "$coupon_code",

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
            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                return res.status(400).json({ message: "Invalid order ID" });
            }
            if(user.role === "customer"){
                const order = await Order.aggregate([
                    {
                        $match:{
                            _id: new mongoose.Types.ObjectId(orderId),
                            user_id: user._id
                        }
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
                                    input:"$items",
                                    as:"menu_item",
                                    in:{
                                        name:"$$menu_item.name",
                                        quantity:"$$menu_item.quantity",
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
                            service_fee:1,
                            discount:1,
                            coupon_code:1,
                            payment_method:1,
                            delivery_address:1,
                            createdAt:1,
                            total_amount:1,
                        }
                    }
                ]);
                if (!order.length) {
                    return res.status(404).json({ message: "Order not found" });
                }
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
        input:"$items",
        as:"menu_item",
        in:{
            name:"$$menu_item.name",
            quantity:"$$menu_item.quantity",
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
                if (!orders.length) {
  return res.status(404).json({
    message: "Order not found",
  });
}

return res.status(200).json(orders[0]);
            }
            return res.status(403).json({ message: "Access denied" });
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }   
};


export const updateOrderStatus = async (req, res) => {
    try {
            const orderId = req.params.id;
            const newStatus = req.body.order_status;
            const order = await Order.findById(orderId);
            if(!order) return res.status(404).json({message:"Order not found"});
            const validTransitions = {
                pending: ["accepted", "cancelled"],
                accepted: ["preparing", "cancelled"],
                preparing: ["ready_for_pickup"],
                ready_for_pickup: ["out_for_delivery"],
                out_for_delivery: ["delivered"],
                delivered: [],
                cancelled: []
            };
            if (!validTransitions[order.order_status]?.includes(newStatus)) {
                return res.status(400).json({
                    message: `Invalid order status transition from ${order.order_status} to ${newStatus}`
                });
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
        if (req.user?.role !== "deliveryPerson") {
            return res.status(403).json({ message: "Delivery partner access required" });
        }
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (
            !order.d_partner_id ||
            order.d_partner_id.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: "You are not assigned to this order" });
        }
        if (order.order_status !== "out_for_delivery") {
            return res.status(400).json({
                message: `Invalid delivery status transition from ${order.order_status} to delivered`
            });
        }
        order.order_status = "delivered";
        await order.save();
        return res.status(200).json({
            message: "Delivery status updated successfully"
        });
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
};


