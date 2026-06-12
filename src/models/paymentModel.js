import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
        order_id:{
            type:mogoose.schema.Types.ObjectId,
            ref:'Order',
            required:true
        },
        payment_method:{
            type:String,
            enum:['online','cod'],
            required:true
        },
        amount:{
            type:Number,
            required:true
        },
        payment_status:{
            type:String,
            enum:["pending","paid","failed"],
            default:"pending"
        },
        transaction_id:{
            type:String,
            unique:true
        },
        paid_at:{
            type:Date
        }
});


export const Payment = mongoose.model('Payment',paymentSchema);



//   order_id,
//   payment_method,
//   amount,
//   payment_status,
//   transaction_id,
//   paid_at 

