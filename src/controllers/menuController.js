import { Restaurant } from "../models/restaurantModel.js";
import { Menu_item } from "../models/menuModel.js";
import AzureStorageService from "../services/azureStorageService.js";

export const createMenuItem = async (req,res)=>{
    try {
        const { name, description, price, category} = req.body;
        const image = req.file; // Assuming the image is sent as a file in the request
        if(!name || !description || !price || !category)  return res.status(400).json({message:'all fields are required'})
        
        const restaurant = await Restaurant.findOne({
            owner_id: req.user._id
        });
        // need to put a check to see if menu item with same name already exists for that restaurant
        if(!restaurant) return res.status(404).json({message:'restaurant not found'});

        const blobName = await AzureStorageService.upload(image, process.env.AZURE_STORAGE_MENU_CONTAINER_NAME);
        const imageUrl = AzureStorageService.generateReadUrl(blobName, process.env.AZURE_STORAGE_MENU_CONTAINER_NAME);
        

       const newMenuItem =  await new Menu_item({
            res_id : restaurant._id,
            name,
            description,
            price,
            category,
            image: blobName
        });
        await newMenuItem.save();
        res.status(200).json({message:'item added successfully',menuItem: newMenuItem, imageUrl});
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const updateMenuItem = async (req,res)=>{
    try {
        const {name, description, price, category} = req.body;
        const image = req.file; 
       const updatedMenuItem =  await Menu_item.findByIdAndUpdate(req.params.id,
            {name, description, price, category},{returnDocument:'after'});
            if(!updatedMenuItem) res.status(404).json({message:'item not found'});
            updatedMenuItem.image = AzureStorageService.replace(
                updatedMenuItem.image,
                image,
                process.env.AZURE_STORAGE_MENU_CONTAINER_NAME);
                await updatedMenuItem.save();
            res.status(200).json({
                message:'menu item updated successfully',
                updatedMenuItem
            });
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const deleteMenuItem = async (req,res)=>{
    try {
        const deletedMenuItem = await Menu_item.findByIdAndDelete(req.params.id);
        if(!deletedMenuItem) res.status(404).json({
            message:'item not found'
        });
         await AzureStorageService.delete(deletedMenuItem.image, process.env.AZURE_STORAGE_MENU_CONTAINER_NAME);
        res.status(200).json({message:'menu item removed successfully',
        deletedMenuItem
        });
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const getAllMenuItems = async (req,res)=>{
    try {
        const menuList = await Menu_item.find();
       if(!menuList) res.status(404).json({
            message:'item list not found'
        });
        const response = menuList.map(item => {
            return {
                ...item.toObject(),
                image: AzureStorageService.generateReadUrl(item.image, process.env.AZURE_STORAGE_MENU_CONTAINER_NAME)
            };
        });
        res.status(200).json({menuList: response})
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const getMenuItemById = async (req,res)=>{
    try {
         const menuItem = await Menu_item.findById(req.params.id);
        if(!menuItem){
            return res.status(404).json({message: 'Menu Item not found'});
        }
        res.status(200).json({menuItem});
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


