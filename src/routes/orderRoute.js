import express from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/protectionMiddleware.js';
import blockDuringTime from "../middlewares/blockDuringTime.js";
import { createOrder, getAllOrders, getOrderById, updateOrderStatus, getAssignedOrders, updateDeliveryStatus } from '../controllers/orderController.js';


const router = express.Router();    

// customer routes
router.post('/placeorder',isAuthenticated,blockDuringTime("23:00", "10:30"), createOrder); // tested
router.get('/myorders', isAuthenticated,getAllOrders);  // tested
router.get('/order/:id', isAuthenticated,getOrderById); // tested

// admin routes
router.get('/getorders',isAuthenticated,isAdmin,getAllOrders); 
router.get('/getorder/:id',isAuthenticated,isAdmin,getOrderById);
router.put('/updateorderstatus/:id',isAuthenticated,isAdmin,updateOrderStatus); //tested

// routes for the delivery partner
router.get('/getassignedorders',isAuthenticated,getAssignedOrders);
router.put('/updatedeliverystatus/:id',isAuthenticated,updateDeliveryStatus);

export default router;
