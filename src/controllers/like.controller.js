import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import ApiError from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to use this endpoint')
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,'invalid tweetId provided')
    }

    const likeExists = await Like.findOne({video: videoId,likedBy: req.user?._id})
    if(likeExists){
        const likeDeleted = await Like.findByIdAndDelete(likeExists._id)
        if(!likeDeleted){
            throw new ApiError(500,'There was an error while unliking the video')
        }
        
        return res
        .json(
            new ApiResponse(
                200,
                {},
                'Video unliked successfully'
            )
        )
    }

    const likeRes = await Like.create({video: videoId,likedBy: req.user?._id})
    if(!likeRes){
        throw new ApiError(500,'There was an error while liking the video')
    }

    return res
    .json(
        new ApiResponse(
            200,
            likeRes,
            'Video liked successfully'
        )
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to use this endpoint')
    }

    if(!isValidObjectId(commentId)){
        throw new ApiError(400,'invalid videoId provided')
    }

    const commentExists = await Like.findOne({comment: commentId,likedBy: req.user._id})
    if(commentExists){
        const commentDeleted = await Like.findByIdAndDelete(commentExists._id)
        if(!commentDeleted){
            throw new ApiError(500,'There was an error while unliking the comment')
        }
        
        return res
        .json(
            new ApiResponse(
                200,
                {},
                'comment unliked successfully'
            )
        )
    }

    const likeRes = await Like.create({comment: commentId,likedBy: req.user._id})
    if(!likeRes){
        throw new ApiError(500,'There was an error while liking the comment')
    }

    return res
    .json(
        new ApiResponse(
            200,
            likeRes,
            'Comment liked successfully'
        )
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to use this endpoint')
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,'invalid tweetId provided')
    }

    const likeExists = await Like.findOne({tweet: tweetId,likedBy: req.user?._id})
    if(likeExists){
        const likeDeleted = await Like.findByIdAndDelete(likeExists._id)
        if(!likeDeleted){
            throw new ApiError(500,'There was an error while unliking the tweet')
        }
        
        return res
        .json(
            new ApiResponse(
                200,
                {},
                'Tweet unliked successfully'
            )
        )
    }

    const likeRes = await Like.create({tweet: tweetId,likedBy: req.user?._id})
    if(!likeRes){
        throw new ApiError(500,'There was an error while liking the tweet')
    }

    return res
    .json(
        new ApiResponse(
            200,
            likeRes,
            'Tweet liked successfully'
        )
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to get liked videos')
    }

    const result = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                tweet: undefined,
                comment: undefined
            }
        }
    ])

    if(!result){
        throw new ApiError(500,'Either no liked videos found or there was an error while fetching them')
    }

    return res
    .json(
        new ApiResponse(
            200,
            result,
            'Liked videos fetched successfully'
        )
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}