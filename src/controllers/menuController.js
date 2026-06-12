import { Restaurant } from "../models/restaurantModel.js";
import { Menu_item } from "../models/menuModel.js";

// need to get image and store it into storage bucket and save the url in db
export const createMenuItem = async (req,res)=>{
    try {
        const { name, description, price, category} = req.body;
        if(!name || !description || !price || !category)  return res.status(400).json({message:'all fields are required'})
        
        const restaurant = await Restaurant.findOne({
            owner_id: req.user._id
        });
        // need to put a check to see if menu item with same name already exists for that restaurant
        if(!restaurant) return res.status(404).json({message:'restaurant not found'});
       const newMenuItem =  await new Menu_item({
            res_id : restaurant._id,
            name,
            description,
            price,
            category
        });
        await newMenuItem.save();
        res.status(200).json({message:'item added successfully',menuItem: newMenuItem})
    } catch (error) {
        res.status(500).json({message: 'Server error', error: error.message})
    }
};


export const updateMenuItem = async (req,res)=>{
    try {
        const {name, description, price, category} = req.body;
       const updatedMenuItem =  await Menu_item.findByIdAndUpdate(req.params.id,
            {name, description, price, category},{returnDocument:'after'});
            if(!updatedMenuItem) res.status(404).json({message:'item not found'});
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
        if(!deletedMenuItem) res.staus(404).json({
            message:'item not found'
        });
        res.status(200).json({message:'menu item removed successfully',
        deleteMenuItem
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
        res.status(200).json({menuList})
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


// add one more function to get all menu_items of a restaurant