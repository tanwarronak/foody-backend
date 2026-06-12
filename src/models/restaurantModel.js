import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
    r_name:{
        type:String,
        required:true
    },
    description:{
        type:String,
    },
    phone:{
        type:Number,
        required:true,
        default:0
    },
    email:{
        type:String,
    },
    owner_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    orders:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Order'
        }
    ],
    is_open:{
        type:Boolean,
        default:true
    },
    opening_time:{
        type:String,
        required:true
    },                     
    closing_time:{
        type:String,
        required:true
    }
})

export const Restaurant = mongoose.model('Restaurant',restaurantSchema);

// r_name,
//   description,
//   phone,
//   email,
//   address,
//   owner_id(F),
//   is_open,
//   opening_time,
//   closing_time
// orders(F)
