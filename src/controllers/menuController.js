import { Restaurant } from "../models/restaurantModel.js";
import { Menu_item } from "../models/menuModel.js";

export const createMenuItem = async (req,res)=>{
    try {
        const { name, description, price, category} = req.body;
        if(!name || !description || price === undefined || !category) {
            return res.status(400).json({message:'all fields are required'});
        }
        
        const restaurant_id = req.params.restaurant_id;

        const restaurant = await Restaurant.findById(restaurant_id);

        if(!restaurant) return res.status(404).json({message:'restaurant not found'});
        const newMenuItem = new Menu_item({
            res_id : restaurant_id,
            name,
            description,
            price,
            category
        });
        await newMenuItem.save();
        res.status(201).json({message:'item added successfully',menuItem: newMenuItem});
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const updateMenuItem = async (req,res)=>{
    try {
        const {name, description, price, category} = req.body;
        const menuItem = await Menu_item.findById(req.params.id).select('-image');
        if(!menuItem) {
            return res.status(404).json({message:'item not found'});
        }

        if (name !== undefined) menuItem.name = name;
        if (description !== undefined) menuItem.description = description;
        if (price !== undefined) menuItem.price = price;
        if (category !== undefined) menuItem.category = category;
        await menuItem.save();

        res.status(200).json({
            message:'menu item updated successfully',
            updatedMenuItem: menuItem
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
        const deletedMenuItem = await Menu_item.findByIdAndDelete(req.params.id).select('-image');
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
        const menuList = await Menu_item.find().select('-image');
        res.status(200).json({menuList})
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const getMenuItemById = async (req,res)=>{
    try {
        const res_id = req.params.restaurant_id;
        const menuItems = await Menu_item.find({res_id}).select('-image');
        if(!menuItems || menuItems.length === 0) {
            return res.status(404).json({message: 'Menu Item not found'});
        }
        res.status(200).json({menuItems});
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};
