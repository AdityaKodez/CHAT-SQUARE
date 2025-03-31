import mongoose from "mongoose"

const userSchema  = new mongoose.Schema(
    {
        email:{
            type:String,
            required:true,
            unique:true,
        },
        password:{
            type:String,
            required:true,
            minlength:6
        },
        fullName:{
            type:String,
            required:true
        },
        profilePic:{
            type:String,
            default:"",
        },
        lastOnline:{
            type:Date,
            default:null,
        },
        description:{
            type:String,
            default:"",
        },
        isVerified:{
            type:Boolean,
            default:false
        },
    },
    {timestamps:true}
)

const User =mongoose.model("User",userSchema)

export default User