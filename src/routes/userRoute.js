import express from 'express';
import {getUserProfile, updateUserProfile, logoutUser, getAdminProfile} from '../controllers/userController.js';
import passport from 'passport';
import { isAuthenticated, isAdmin } from '../middlewares/protectionMiddleware.js';


const router = express.Router();


router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/api/users/profile', failureRedirect: '/login' }));

// customer routes
router.get('/profile',isAuthenticated, getUserProfile);
router.put('/profile',isAuthenticated, updateUserProfile);
router.post('/logout', isAuthenticated, logoutUser);

// owner routes
router.get('/admin/profile', isAuthenticated, isAdmin, getAdminProfile);
router.put('/admin/profile', isAuthenticated, isAdmin, updateUserProfile);
router.post('/admin/logout', isAuthenticated, isAdmin, logoutUser);


export default router;