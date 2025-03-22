import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import ApiError from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!channelId){
        throw new ApiError(400,'No channelId provided')
    }
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to subscribe')
    }

    if(req.user?._id === channelId){
        throw new ApiError(400,'User cannot subscribe to its own channel')
    }

    const channelExists = await User.findById(channelId)
    if(!channelExists){
        throw new ApiError(404,'No channel found')
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    if(isSubscribed){
        const isUnsubscribed = await Subscription.findByIdAndDelete(isSubscribed._id)

        if(!isUnsubscribed){
            throw new ApiError(500,'There was an error while unsubscribing')
        }

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                'Channel unsubscribed successfully'
            )
        )
    }

    const subscribeResponse = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })
    if(!subscribeResponse){
        throw new ApiError(500,'There was an error while subscribing channel')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribeResponse,
            'Channel subscribed succesfully'
        )
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId){
        throw new ApiError(400,'No channel id given in parameter')
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'subscriber',
                foreignField: '_id',
                as: 'subscriber',
                pipeline: [{
                    $project: {
                        fullName: 1,
                        _id: 1,
                        avatar: 1,
                        username: 1,
                    }
                }]
            }
        },
        {
            $project: {
                subscriber: 1,
                createdAt: 1,
                _id: 1
            }
        },
        {
            $addFields: {
                subscriber:{
                   $first: '$subscriber'
                }
            }
        }
    ])

    if(!subscribers){
        throw new ApiError(500,'There was an error while fetching channel subscribers')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribers,
            'Channel subscribers fetched successfully'
        )
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!subscriberId){
        throw new ApiError(400,'No subscriber id given in parameters')
    }

    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'channel',
                foreignField: '_id',
                as: 'channel',
                pipeline: [{
                    $project: {
                        fullName: 1,
                        _id: 1,
                        avatar: 1,
                        username: 1,
                    }
                }]
            }
        },
        {
            $project: {
                channel: 1,
                createdAt: 1,
                _id: 1
            }
        },
        {
            $addFields: {
                channel:{
                   $first: '$channel'
                }
            }
        }
    ])

    if(!subscriptions){
        throw new ApiError(500,'There was an error while fetching user subscriptions')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscriptions,
            'User subscriptions fetched successfully'
        )
    )


})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}