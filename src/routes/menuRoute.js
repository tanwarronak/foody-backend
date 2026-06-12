import express from 'express';
import { isAdmin, isAuthenticated } from '../middlewares/protectionMiddleware.js';
import { createMenuItem, updateMenuItem, deleteMenuItem, getAllMenuItems, getMenuItemById } from '../controllers/menuController.js';


const router = express.Router();


// only accessible by admin
router.post('/additem',isAuthenticated,isAdmin,createMenuItem );
router.put('/updateitem/:id',isAuthenticated,isAdmin,updateMenuItem);
router.delete('/removeitem/:id',isAuthenticated,isAdmin,deleteMenuItem);

// for customers 
router.get('/getmenuitems',getAllMenuItems);
router.get('/getmenuitem/:id',isAuthenticated,getMenuItemById);



export default router;