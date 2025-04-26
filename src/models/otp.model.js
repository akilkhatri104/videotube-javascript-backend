import mongoose, { mongo } from "mongoose";
import mailSender from "../utils/mailSender.js";

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 5, // The document will be deleted in 5 mins after creation
    }
})

async function sendVerificationEmail(email,otp){
    try {
        const mailResponse =  await mailSender(
            email,
            'Verification Email',
            `<h1>Please confirm your OTP</h1>
            <p>Here is your OTP code: ${otp}</p>`
        )       
        console.log('Email send succesfully: ',mailResponse)
    } catch (error) {
        console.log(error)
        throw error
    }
}

otpSchema.pre('save',async function(next) {
    if(this.isNew){
        await sendVerificationEmail(this.email,this.otp)
    }
    next()
})

export const OTP = mongoose.model('OTP',otpSchema)