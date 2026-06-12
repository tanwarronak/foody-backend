import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
name:{
    type:String,
    required:true
},
email:{
    type:String,
    required:true
},
googleId:{
    type:String,
    required:true,
    unique:true
},
address:{
    type:String,
    // required:true
},
role:{
    type:String,
    enum:["customer","admin","deliveryPerson"],
    required:true,
    default:"customer"
},
phone:{
    type:Number,
    required:true,
    default:0
},
createdAt:{
    type:Date,
    default:Date.now
},
orders:[
    {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Order'
    }
]
});

export const User = mongoose.model("User", userSchema);



// name,
//   email,
//   address,
//   orders,
//   password,
//   role,
//   phone

