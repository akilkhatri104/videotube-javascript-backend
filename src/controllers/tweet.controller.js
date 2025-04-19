import mongoose, { isValidObjectId, Mongoose } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to create a tweet')
    }

    const {content} = req.body
    if(!content){
        throw new ApiError(400,'No content given in body')
    }

    const tweetCreated = await Tweet.create({
        owner: req.user?._id,
        content: content
    })

    if(!tweetCreated){
        throw new ApiError(500,'There was an error while creating the tweet')
    }

    return res
    .json(
        new ApiResponse(
            201,
            tweetCreated,
            'Tweet created succesfully'
        )
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(400,'Invalid user id given')
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        }
    ])

    if(!tweets){
        throw new ApiError(500,'Either there are not tweets by the user or there was an error while fetching them')
    }

    return res
    .json(
        new ApiResponse(
            200,
            tweets,
            'Tweets fetched succesfully'
        )
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body

    if(!content){
        throw new ApiError(400,"No content given in body")
    }

    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,'Either no or invalid tweet provided in parameter')
    }

    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to update tweet')
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404,'No tweet found')
    }
    
    if(tweet.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,'User needs to be owner to update the tweet')
    }

    tweet.content = content
    const updatedTweet = await tweet.save()

    if(!updatedTweet){
        throw new ApiError(500,'There was an error while updating the tweet')
    }

    return res
    .json(
        new ApiResponse(
            200,
            updatedTweet,
            'Tweet updated succesfully'
        )
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,'Either no or invalid tweet id given in parameter')
    }

    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to delete a tweet')
    }

    const tweetExists = await Tweet.findById(tweetId)
    if(!tweetExists){
        throw new ApiError(404,'No tweet found')
    }

    if(tweetExists.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,'User needs to be owner of the tweet in order to delete it')
    }

    const deleteRes = await Tweet.findByIdAndDelete(tweetId)

    if(!deleteRes){
        throw new ApiError(500,"There was an error while deleting the tweet")
    }

    return res
    .json(
        new ApiResponse(
            200,
            {},
            "tweet deleted succesfully"
        )
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}