import express from 'express';
import {isAuthenticated, isAdmin} from '../middlewares/protectionMiddleware.js';
import { createRestaurant, getAllRestaurants, getRestaurantById, updateRestaurant, deleteRestaurant, setRestaurantStatus } from '../controllers/restaurantController.js';
import { upload } from '../config/multerConfig.js';

const  router = express.Router();

router.post('/register',isAuthenticated,isAdmin, upload.single('image'), createRestaurant);
router.get('/getrestaurants', getAllRestaurants);
router.get('/getrestaurant/:id', getRestaurantById);
router.patch('/:id/status', isAuthenticated, isAdmin, setRestaurantStatus);
router.put('/updaterestaurant/:id', isAuthenticated, isAdmin, upload.single('image'), updateRestaurant);
router.delete('/deleterestaurant/:id', isAuthenticated, isAdmin, deleteRestaurant);


export default router;
