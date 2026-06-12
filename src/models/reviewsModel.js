import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
        order_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Order',
            required:true
        },
        customer_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        res_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Restaurant',
            required:true
        },
       comment:{
        type:String,
       },
       created_at:{
        type:Date,
        default:Date.now
       }

       // remember to add rating property 
});


export const Reviews = mongoose.model("Review", reviewSchema);




// order_id(F),
//   customer_id(F),
//   res_id,
//   rating,
//   comment,
//   created_at

