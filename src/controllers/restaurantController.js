import {Restaurant} from '../models/restaurantModel.js';
import {Order} from '../models/ordersModel.js';


// create a new restaurant
export const createRestaurant = async (req, res) => {
        try{
            const {name,  description, phone, email,address, opening_time, closing_time} = req.body;
            const owner_id = req.user._id;   // it may create problem
            if(String(phone).length!==10) return res.status(400).json({
            message:'Phone number should be of 10 digits'
         })
            const newRestaurant = new Restaurant({
                r_name:name,
                description,
                phone,
                email,
                address,
                owner_id,
                opening_time,
                closing_time
            });
            await newRestaurant.save();
            res.status(201).json({message: 'Restaurant created successfully', restaurant: newRestaurant});
        }
        catch(error){
                res.status(500).json({message: 'Server error', error: error.message});
        }
};



// get all restaurants
export const getAllRestaurants = async (req, res) => {
    try{
        const restaurants = await Restaurant.find();
        res.status(200).json({restaurants});
    }
    catch(error){
        res.status(500).json({message: 'Server error', error: error.message});
    }
};


// get a restaurant by id
export const getRestaurantById = async (req, res) => {
    try{
        const restaurant = await Restaurant.findById(req.params.id);
        if(!restaurant){
            return res.status(404).json({message: 'Restaurant not found'});
        }
        res.status(200).json({restaurant});
    }
    catch(error){
        res.status(500).json({message: 'Server error', error: error.message});
    }
};


// update a restaurant
export const updateRestaurant = async (req, res) => {
    try{
        const {name,  description, phone, email,address, opening_time, closing_time} = req.body;
        if(String(phone).length!==10) return res.status(400).json({
            message:'Phone number should be of 10 digits'
         })
        const restaurant = await Restaurant.findByIdAndUpdate(req.params, {
            r_name:name,
            description,
            phone,
            email,
            address,
            opening_time,
            closing_time
        },{
            returnDocument:'after'
        });
        if(!restaurant){
            return res.status(404).json({message: 'Restaurant not found'});
        }
        res.status(200).json({message: 'Restaurant updated successfully', restaurant});
    }
    catch(error){
        res.status(500).json({message: 'Server error', error: error.message});
    }
};


// delete a restaurant
export const deleteRestaurant = async (req, res) => {
    try{
        const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
        if(!restaurant){
            return res.status(404).json({message: 'Restaurant not found'});
        }
        res.status(200).json({message: 'Restaurant deleted successfully'});
    }
    catch(error){
        res.status(500).json({message: 'Server error', error: error.message});
    }
};
