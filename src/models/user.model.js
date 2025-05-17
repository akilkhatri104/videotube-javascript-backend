import mongoose,{Schema} from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { Playlist } from './playlist.model.js'

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        isEmailVerified: {
          type: Boolean,
          default: false  
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String, //cloudnary url,
        },
        coverImage: {
            type: String, //cloudnary url
        },
        watchHistory: {
            type: Schema.Types.ObjectId,
            ref: 'Playlist'
        },
        watchLater: {
            type: Schema.Types.ObjectId,
            ref: 'Playlist'
        },
        likedVideos: {
            type: Schema.Types.ObjectId,
            ref: 'Playlist'
        },
        savedPlaylists: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Playlist'
            }
        ],
        password: {
            type: String,
            required: [true,'Password is required'],
        },
        refreshToken: {
            type: String,
        }
        
    },
    {
        timestamps: true
    }
)

userSchema.pre('save',async function(next) {
    if(this.isModified('password'))
        this.password = await bcrypt.hash(this.password,10)
    if(this.isNew){
        const watchHistory = await Playlist.create({
            name: 'Watch History',
            owner: this._id,
            isPublic: false,
            isDefaultPlaylist: false
        })
        this.watchHistory = watchHistory._id
        const watchLater = await Playlist.create({
            name: 'Watch Later',
            owner: this._id,
            isPublic: false,
            isDefaultPlaylist: false
        })
        this.watchLater = watchLater._id
        const likedVideos = await Playlist.create({
            name: 'Liked Videos',
            owner: this._id,
            isPublic: false,
            isDefaultPlaylist: false
        })
        this.likedVideos = likedVideos._id
    }
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User',userSchema)