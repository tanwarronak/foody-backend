import mongoose, { Schema } from "mongoose";

const orderSchema = new mongoose.Schema({
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
    d_partner_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        // required:true,
        default:null
    },
    items:[
        {
            menu_item_id:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'Menu_item',
                required:true
            },
            quantity:{
                type:Number,
                required:true,
                min:1
            },
            price:{
                type:Number,
                required:true,
                min:0
            }
        }
    ],
    order_status:{
        type:String,
        enum:["pending","accepted","preparing","ready_for_pickup","out_for_delivery","delivered","cancelled"],
        default:"pending"
    },
    payment_status:{
        type:String,
        enum:["pending","paid","failed"],
        default:"pending"
    },
    payment_method:{
        type:String,
        enum:["cod","online"],
        default:"cod"
    },
    subtotal:{
        type:Number,
        default:0
    },
    delivery_fee:{
        type:Number,
        default:0
    },
    platform_fee:{
        type:Number,
        default:0
    },
    total_amount:{
        type:Number,
        default:0
    },
    delivery_address:{
        type:String,
    },
    estimated_delivery_time:{
        type:Date,      
    }
});

export const Order = mongoose.model("Order", orderSchema);



// user_id(F),
//   res_id(F),
//   d_partner_id(F),
//   order_status,
//   payment_status,
//   subtotal,
//   delivery_fee,
//   platform_fee,
//   total_amount,
//   delivery_address,
//   estimated_delivery_time

