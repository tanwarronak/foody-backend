import express from 'express';
import {isAuthenticated, isAdmin} from '../middlewares/protectionMiddleware.js';
import { createRestaurant, getAllRestaurants, getRestaurantById, updateRestaurant, deleteRestaurant } from '../controllers/restaurantController.js';

const router = express.Router();

router.post('/register',isAuthenticated, isAdmin, createRestaurant);
router.get('/getrestaurants', getAllRestaurants);
router.get('/getrestaurant/:id', getRestaurantById);
router.put('/updaterestaurant/:id',isAuthenticated, isAdmin, updateRestaurant);
router.delete('/deleterestaurant/:id', isAuthenticated, isAdmin, deleteRestaurant);


export default router;
