import mongoose, { mongo } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from '../models/video.model.js'
import ApiError from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!videoId){
        throw new ApiError(400,'No video id given')
    }

    const videoExists = await Video.findById(videoId)
    if(!videoExists){
        throw new ApiError(404,'No video found')
    }

    const options = {page,limit}
    const aggrigate  = Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId),
            }
        },
        {
            $project:{
                _id:1,
                content:1,
                owner:1,
                createdAt:1,
                updatedAt:1
            }
        },
        {
            $lookup:{
                from:'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [
                    {
                        $project: {
                            _id:1,
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner: {
                    $first: '$owner'
                }
            }
        }
    ])
    const result = await Comment.aggregatePaginate(aggrigate,options)

    if(result.totalDocs == 0){
        throw new ApiError(404,'No comments found')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            result,
            'Comments fetched succesfully'
        )
    )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {content} = req.body

    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to comment on a video')
    }

    if(!videoId){
        throw new ApiError(400,'Video id is required to comment on a video')
    }

    if(!content){
        throw new ApiError(400,'Content is required for the comment')
    }

    const videoExists = await Video.findById(videoId)
    if(!videoExists){
        throw new ApiError(404,'Video not found, cannot comment')
    }

    const comment = await Comment.create({
        owner: req.user?._id,
        video: videoId,
        content: content
    })

    const commentCreated = await Comment.findById(comment?._id)
    if(!commentCreated){
        throw new ApiError(500,'There was an error while creating the comment')
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            commentCreated,
            'Comment created successfully'
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const {content} = req.body
    
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to update a comment')
    }

    if(!commentId){
        throw new ApiError(400,'Comment id is required to update a comment')
    }

    if(!content){
        throw new ApiError(400,'Content is required for the comment')
    }

    const commentExists = await Comment.findById(commentId)
    if(!commentExists){
        throw new ApiError(404,'Comment not found, cannot update')
    }

    if(commentExists.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,'You are not authorized to update this comment')
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId, {content}, {new: true})

    if(!updatedComment){
        throw new ApiError(500,'There was an error while updating the comment')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedComment,
            'Comment updated successfully'
        )
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params
    if(!commentId){
        throw new ApiError(400,'No comment id given in the parameter')
    }

    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to delete a comment')
    }

    const commentExists = await Comment.findById(commentId)
    if(!commentExists){
        throw new ApiError(404,'No comment found')
    }

    if(commentExists.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,'You are not authorized to delete this comment')
    }

    const commentDeleted = await Comment.findByIdAndDelete(commentId)
    if(!commentDeleted){
        throw new ApiError(500,'There was an error while deleting the comment')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            'Comment deleted succesfully'
        )
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }