import mongoose, { mongo } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import ApiError from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }

    const stats = {
        totalVideos: 0,
        totalLikes: 0,
        totalSubscribers: 0,
        totalViews: 0
    }

    const videosPromise = Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'video',
                as: 'likes'
            }
        }
    ])

    const subscribersPromise = Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(req.user?._id)
            }
        }
    ])


    const videos = await videosPromise
    const subscribers = await subscribersPromise

    if(videos.length != 0){
        stats.totalVideos = videos.length
        videos.forEach(videoObj => stats.totalViews += videoObj.views)
    }

    videos.forEach(video => video.likes && Array.isArray(video.likes) && (stats.totalLikes += video.likes.length))

    if(subscribers.length != 0){
        stats.totalSubscribers += subscribers.length
    }

    return res
    .json(
        new ApiResponse(
            200,
            stats,
            'Stats fetched successfully'
        )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { 
            page = 1, 
            limit = 10,
            sortBy="createdAt", 
            sortType="desc",
        } = req.query
    
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to get channel videos')
    }
        
        const options = {page,limit}
        const aggregate = Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(req.user?._id),
                },
            },
            {
                $sort: {
                    [sortBy]: sortType == 'desc' ? -1 : 1
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    owner: {
                        $first: '$owner'
                    }
                }
            }
        ])
        const result = await Video.aggregatePaginate(aggregate,options)
    
        if(result.totalDocs == 0){
            throw new ApiError(404,'No video found')
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "Videos fetched successfully"
            )
        )
})

export {
    getChannelStats, 
    getChannelVideos
    }