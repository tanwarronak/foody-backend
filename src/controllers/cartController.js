import {Cart_items} from '../models/cartModel.js';

export const addToCart = async (req, res) => {
    try{
const userId = req.user._id;
const { itemId, restaurantId, quantity } = req.body;

if (!itemId || !restaurantId || !quantity) {
    return res.status(400).json({
        message: "Missing required fields"
    });
}

let cart = await Cart_items.findOne({ user_id: userId });

if (!cart) {
    // No cart exists → create one with the item
    cart = new Cart_items({
        user_id: userId,
        res_id: restaurantId,
        menu: [
            {
                menu_item_id: itemId,
                quantity: quantity
            }
        ]
    });
} else {
    // Cart exists but has no items
    if (cart.menu.length === 0) {
        cart.res_id = restaurantId;
    }

    // Cart has items from another restaurant
    else if (cart.res_id.toString() !== restaurantId.toString()) {
        return res.status(409).json({
            message: "Your cart contains items from another restaurant.",
            code: "DIFFERENT_RESTAURANT",
            currentRestaurantId: cart.res_id,
            requestedRestaurantId: restaurantId
        });
    }

    // Check if item already exists
    const existingItem = cart.menu.find(
        item => item.menu_item_id.toString() === itemId.toString()
    );

    if (existingItem) {
        // Increase quantity
        existingItem.quantity += quantity;
    } else {
        // Add new item
        cart.menu.push({
            menu_item_id: itemId,
            quantity: quantity
        });
    }
}

await cart.save();

return res.status(200).json({
    message: "Item added to cart successfully",
    cart
});
}
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};


export const viewCart = async (req, res) => {
    try{
        const userId =  req.user._id;
        const cart = await Cart_items.findOne({ user_id: userId }).populate('menu.menu_item_id');
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        res.status(200).json({ cart });
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};


export const removeFromCart = async (req, res) => {
    try{
        const userId = req.user._id ;
        const  itemId  = req.params.itemId;
        const cart = await Cart_items.findOne({ user_id: userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        cart.menu = cart.menu.filter(item => item.menu_item_id.toString() !== itemId);
        await cart.save();
        res.status(200).json({ message: "Item removed from cart successfully", cart });
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};


export const updateCartItemQuantity = async (req, res) => {
    try{
        const userId = req.user._id ;
        const  itemId  = req.params.itemId;
        const { quantity } = req.body;
        const cart = await Cart_items.findOne({ user_id: userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        const itemIndex = cart.menu.findIndex(item => item.menu_item_id.toString() === itemId);
        if (itemIndex >= 0) {
            cart.menu[itemIndex].quantity = quantity;
            await cart.save();
            res.status(200).json({ message: "Item quantity updated successfully", cart });
        } else {
            return res.status(404).json({ message: "Item not found in cart" });
        }
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};


export const clearCart = async (req, res) => {
    try{
        const userId = req.user._id ;
        const cart = await Cart_items.findOne({ user_id: userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        cart.menu = [];
        await cart.save();
        res.status(200).json({ message: "Cart cleared successfully", cart });
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
};

