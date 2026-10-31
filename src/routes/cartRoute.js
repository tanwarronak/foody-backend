import express from 'express';
import { isAuthenticated } from '../middlewares/protectionMiddleware.js';
import { addToCart, viewCart, removeFromCart, updateCartItemQuantity, clearCart } from '../controllers/cartController.js';

const router = express.Router();

router.post('/add',isAuthenticated,  addToCart);
router.get('/view',isAuthenticated, viewCart);
router.delete('/remove/:itemId', isAuthenticated, removeFromCart);
router.put('/update/:itemId', isAuthenticated, updateCartItemQuantity);
router.delete('/clear', isAuthenticated, clearCart);

export default router;