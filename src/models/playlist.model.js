import mongoose,{Schema} from "mongoose";

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Video'
            }
        ],
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        canUserModify: {
            type: Boolean,
            default: true,
        },
        isPublic: {
            type: Boolean,
            default: true
        }
    },
    {timestamps:true}
)

export const Playlist = mongoose.model('Playlist',playlistSchema)