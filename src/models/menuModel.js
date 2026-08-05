import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
    res_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Restaurant',
        required:true
    },
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
    },
    price:{
        type:Number,
        required:true,
        default:0
    },
    image:{
        type:String,
    },
    category:{
        type:String,
    },
    is_available:{
        type:Boolean,
        default:true
    }
});


export const  Menu_item = mongoose.model('Menu_item',menuSchema);