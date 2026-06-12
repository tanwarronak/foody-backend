import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
        user_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        res_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Restaurant',
            required:true
        },
        menu:[
           {
            menu_item_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Menu_item',
            required:true
           },
            quantity:{
                type:Number,
                required:true,
                default:1
              }
            }
        ]
});


export const Cart_items = mongoose.model('Cart_item',cartSchema);


// user_id(F),
//   menu_item_id(F),---> quantity


