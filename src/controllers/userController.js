import {User} from '../models/userModel.js';
import {Order} from '../models/ordersModel.js';
import setupGoogleAuth from '../utils/googleAuth.js';



export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        res.status(200).json({
            name: user.name,
            email: user.email,
            address: user.address,
            phone: user.phone
        });
    } catch (error) {
        res.status(500).json({
            message: 'please login again'
        });
    }
};

 export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, address, phone } = req.body;
        if(String(phone).length!==10) return res.status(400).json({
            message:'Phone number should be of 10 digits'
        })
        const user = await User.findByIdAndUpdate(userId, { name, address, phone }, { returnDocs: 'after' });
        res.status(200).json({
            name: user.name,
            email: user.email,
            address: user.address,
            phone: user.phone
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
 };


 export const logoutUser = (req, res,next) => {
  try{
    req.logout(error => {
    if(error) return next(error);
    req.session.destroy(err => {
        if(err) return next(err);
        res.status(200).json({ 
            success:true,
            message: 'Logged out successfully' });
    })
  })
  }
  catch(error){
    res.status(500).json({ message: error.message });
  }
 };


 export const getAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id;
        const admin = await User.findById(adminId)
        const orders = await Order.find({ res_id: adminId });
        const totalOrders = orders.length;
        if(totalOrders===0) return res.status(200).json({
            name: admin.name,
            address: admin.address,
            phone: admin.phone,
            email: admin.email,
            totalOrders: 0,
            totalIncome: 0
        });
        const totalIncome = orders.reduce((sum, order) => sum + order.subtotal, 0);
        res.status(200).json({
            name: admin.name,
            address: admin.address,
            phone:admin.phone,
            email: admin.email,
            totalOrders,
            totalIncome
        })
    }
    catch(err){
        res.status(500).json({ message: err.message });
    }
 }
