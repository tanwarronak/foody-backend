import express from 'express';
import { isAdmin, isAuthenticated } from '../middlewares/protectionMiddleware.js';
import { createMenuItem, updateMenuItem, deleteMenuItem, getAllMenuItems, getMenuItemById } from '../controllers/menuController.js';
import { upload } from '../config/multerConfig.js';


const router = express.Router();


// only accessible by admin
router.post('/additem/', upload.single('image'), isAuthenticated, isAdmin, createMenuItem);
router.put('/updateitem/:id', upload.single('image'), isAuthenticated, isAdmin, updateMenuItem);
router.delete('/removeitem/:id', isAuthenticated, isAdmin, deleteMenuItem);

// for customers 
router.get('/getmenuitems',getAllMenuItems);
router.get('/getmenuitem/:restaurant_id',isAuthenticated,getMenuItemById);



export default router;