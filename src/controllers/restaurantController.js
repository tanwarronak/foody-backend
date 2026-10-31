import {Restaurant} from '../models/restaurantModel.js';
import {Order} from '../models/ordersModel.js';
import AzureStorageService from '../services/azureStorageService.js';


// create a new restaurant
export const createRestaurant = async (req, res) => {
        try{

            const {name,  description, phone, email,address, opening_time, closing_time} = req.body;
            const owner_id = "6a281020d3912b1ba75fd6e5";   // it may create problem
            const image = req.file; 
            if(String(phone).length!==10) return res.status(400).json({
            message:'Phone number should be of 10 digits'
         });
        const blobName = await AzureStorageService.upload(image, process.env.AZURE_STORAGE_RESTAURANT_CONTAINER_NAME);

        let imageUrl =  AzureStorageService.generateReadUrl(blobName, process.env.AZURE_STORAGE_RESTAURANT_CONTAINER_NAME);

            const newRestaurant = new Restaurant({
                r_name:name,
                description,
                phone,
                email,
                address,
                image:blobName,
                owner_id,
                opening_time,
                closing_time
            });
            await newRestaurant.save();
            res.status(201).json({message: 'Restaurant created successfully', restaurant: newRestaurant, imageUrl});
        }
        catch(error){
                res.status(500).json({message: 'Server error', error: error.message});
        }
};



// get all restaurants
export const getAllRestaurants = async (req, res) => {
    try{
        const restaurants = await Restaurant.find();
        const response =
    restaurants.map(restaurant => {

        return {

            ...restaurant.toObject(),

            image:
                AzureStorageService.generateReadUrl(
                    restaurant.image,
                    process.env.AZURE_STORAGE_RESTAURANT_CONTAINER_NAME
                )

        };

    })
        res.status(200).json({restaurants:response});
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
        restaurant.image = AzureStorageService.generateReadUrl(restaurant.image, process.env.AZURE_STORAGE_RESTAURANT_CONTAINER_NAME);
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
        if(phone !== undefined && String(phone).length!==10) return res.status(400).json({
            message:'Phone number should be of 10 digits'
         })

        const restaurant = await Restaurant.findById(req.params.id);
        if(!restaurant){
            return res.status(404).json({message: 'Restaurant not found'});
        }

        const containerName = process.env.AZURE_STORAGE_RESTAURANT_CONTAINER_NAME;
        const oldBlobName = restaurant.image;
        let newBlobName;
        if(req.file){
            newBlobName = await AzureStorageService.upload(req.file, containerName);
        }

        const updates = {
            r_name:name,
            description,
            phone,
            email,
            address,
            opening_time,
            closing_time
        };
        if(newBlobName){
            updates.image = newBlobName;
        }

        let updatedRestaurant;
        try{
            updatedRestaurant = await Restaurant.findByIdAndUpdate(req.params.id, updates, {
                returnDocument:'after'
            });
        } catch(error){
            if(newBlobName){
                try{
                    await AzureStorageService.delete(newBlobName, containerName);
                } catch(cleanupError){
                    console.error('Error cleaning up replacement restaurant image:', cleanupError);
                }
            }
            throw error;
        }

        if(!updatedRestaurant){
            if(newBlobName){
                await AzureStorageService.delete(newBlobName, containerName);
            }
            return res.status(404).json({message: 'Restaurant not found'});
        }

        if(newBlobName && oldBlobName){
            await AzureStorageService.delete(oldBlobName, containerName);
        }

        const response = {message: 'Restaurant updated successfully', restaurant: updatedRestaurant};
        if(newBlobName){
            response.imageUrl = AzureStorageService.generateReadUrl(newBlobName, containerName);
        }
        res.status(200).json(response);
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
