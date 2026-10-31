import { Restaurant } from "../models/restaurantModel.js";
import { Menu_item } from "../models/menuModel.js";
import AzureStorageService from "../services/azureStorageService.js";

export const createMenuItem = async (req,res)=>{
    try {
        const { name, description, price, category} = req.body;
        const image = req.file;
        if(!name || !description || price === undefined || !category) {
            return res.status(400).json({message:'all fields are required'});
        }
        if (!image) {
            return res.status(400).json({message:'image is required'});
        }
        
        const restaurant_id = req.params.restaurant_id;

        const restaurant = await Restaurant.findById(restaurant_id);

        if(!restaurant) return res.status(404).json({message:'restaurant not found'});
        const containerName = process.env.AZURE_STORAGE_MENU_CONTAINER_NAME;
        const blobName = await AzureStorageService.upload(image, containerName);
        const newMenuItem = new Menu_item({
            res_id : restaurant_id,
            name,
            description,
            price,
            category,
            image: blobName
        });
        await newMenuItem.save();
        const imageUrl = AzureStorageService.generateReadUrl(blobName, containerName);
        res.status(201).json({message:'item added successfully',menuItem: newMenuItem, imageUrl});
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const updateMenuItem = async (req,res)=>{
    try {
        const {name, description, price, category} = req.body;
        const menuItem = await Menu_item.findById(req.params.id);
        if(!menuItem) {
            return res.status(404).json({message:'item not found'});
        }

        const oldBlobName = menuItem.image;
        const containerName = process.env.AZURE_STORAGE_MENU_CONTAINER_NAME;
        if (req.file) {
            menuItem.image = await AzureStorageService.upload(req.file, containerName);
        }
        if (name !== undefined) menuItem.name = name;
        if (description !== undefined) menuItem.description = description;
        if (price !== undefined) menuItem.price = price;
        if (category !== undefined) menuItem.category = category;
        await menuItem.save();

        if (req.file && oldBlobName) {
            await AzureStorageService.delete(oldBlobName, containerName);
        }
        const imageUrl = menuItem.image
            ? AzureStorageService.generateReadUrl(menuItem.image, containerName)
            : null;
        res.status(200).json({
            message:'menu item updated successfully',
            updatedMenuItem: menuItem,
            imageUrl
        });
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const deleteMenuItem = async (req,res)=>{
    try {
        const menuItem = await Menu_item.findById(req.params.id);
        if(!menuItem) return res.status(404).json({
            message:'item not found'
        });
        if (menuItem.image) {
            await AzureStorageService.delete(
                menuItem.image,
                process.env.AZURE_STORAGE_MENU_CONTAINER_NAME
            );
        }
        const deletedMenuItem = await Menu_item.findByIdAndDelete(req.params.id);
        res.status(200).json({
            message:'menu item removed successfully',
            deletedMenuItem
        });
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const getAllMenuItems = async (req,res)=>{
    try {
        const menuList = await Menu_item.find();
        const response = menuList.map(item => {
            const menuItem = item.toObject();
            return {
                ...menuItem,
                image: menuItem.image
                    ? AzureStorageService.generateReadUrl(
                        menuItem.image,
                        process.env.AZURE_STORAGE_MENU_CONTAINER_NAME
                    )
                    : null
            };
        });
        res.status(200).json({menuList: response})
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const getMenuItemById = async (req,res)=>{
    try {
        const res_id = req.params.restaurant_id;
        const menuItems = await Menu_item.find({res_id});
        if(!menuItems || menuItems.length === 0) {
            return res.status(404).json({message: 'Menu Item not found'});
        }
        const response = menuItems.map(item => {
            const menuItem = item.toObject();
            return {
                ...menuItem,
                image: menuItem.image
                    ? AzureStorageService.generateReadUrl(
                        menuItem.image,
                        process.env.AZURE_STORAGE_MENU_CONTAINER_NAME
                    )
                    : null
            };
        });
        res.status(200).json({menuItems: response});
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};
