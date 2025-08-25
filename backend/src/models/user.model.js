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
        blockedUsers:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }],
    },
    {timestamps:true}
)

// Add database indexes for better query performance
userSchema.index({ lastOnline: -1 }); // For sorting by lastOnline
userSchema.index({ email: 1 }); // Already unique, but ensure index
userSchema.index({ createdAt: -1 }); // For sorting by creation date
userSchema.index({ fullName: 'text' }); // For text search if needed
userSchema.index({ isVerified: 1 }); // For filtering by verification status

const User =mongoose.model("User",userSchema)

export default User
