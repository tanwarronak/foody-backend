import express from 'express';
import {isAuthenticated, isAdmin} from '../middlewares/protectionMiddleware.js';
import { createRestaurant, getAllRestaurants, getRestaurantById, updateRestaurant, deleteRestaurant } from '../controllers/restaurantController.js';
import { upload } from '../config/multerConfig.js';

const  router = express.Router();

router.post('/register',isAuthenticated,isAdmin, upload.single('image'), createRestaurant);
router.get('/getrestaurants', getAllRestaurants);
router.get('/getrestaurant/:id', getRestaurantById);
router.put('/updaterestaurant/:id', upload.single('image'), isAuthenticated, isAdmin, updateRestaurant);
router.delete('/deleterestaurant/:id', isAuthenticated, isAdmin, deleteRestaurant);


export default router;
