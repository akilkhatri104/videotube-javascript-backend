import mongoose, {isValidObjectId, mongo} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, generateThumbnail, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        query="", 
        sortBy="createdAt", 
        sortType="desc", 
        userId 
    } = req.query
    console.log("Queries: ",req.query);
    
    //TODO: get all videos based on query, sort, pagination
    
    const options = {page,limit}
    const aggregate = Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                isPublished: true,
                title: {
                    $regex: query,
                    $options: 'i'
                }
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

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    
    //get video and thumbnailUrl from multer
    //check if video and thumbnai are present - if not throw an error
    //get other details from req.body
    //upload video and thumbnailUrl to cloudinary
    //check if video and thumbnailUrl are uploaded
    //create video model
    //save video
    //return video in response

    if(!req.user){
        throw new ApiError(400,'Unauthorized access')
    }

    const {title,description} = req.body

    if(!title || !description){
        throw new ApiError(400,'Title and Description are required')
    }
    
    let videoLocalPath = null
    if(req.files && req.files.videoFile && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0){
        videoLocalPath = req.files.videoFile[0].path
    }
    const thumbnailUrlLocalPath = req.files?.thumbnail[0].path

    if(!videoLocalPath){
        throw new ApiError(400,'Video file is required')
    }

    const video = await uploadOnCloudinary(videoLocalPath)

    if(!video){
        throw new ApiError(400,'Video file upload failed')
    }
    console.log("Video: ",video);
    let thumbnailUrl = null
    if(thumbnailUrlLocalPath){
        const thumbnail = await uploadOnCloudinary(thumbnailUrlLocalPath)
        thumbnailUrl = thumbnail?.url
    }else{
        thumbnailUrl = await generateThumbnail(video)
    }

    if(!thumbnailUrl){
        throw new ApiError(400,'thumbnailUrl file upload failed')
    }

    const videoObject = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnailUrl,
        owner: req.user._id,
        duration: video.duration,
        title,
        description
    })

    const videoCreated = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoObject._id)
            }
        },
        {
            $lookup: {
                from: 'users',
                localField:'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [
                    {
                        $project:{
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            coverImage: 1,
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

    if(!videoCreated){
        throw new ApiError(500,'Something went wrong while publishing the video')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videoCreated,
            'Video published successfully'
        )
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!videoId){
        throw new ApiError(400,'No video id given in parameter')
    }

    const videoObj = await Video.findById(videoId)
    if(!videoObj){
        throw new ApiError(404,'No video found')
    }

    if(!videoObj.isPublished && videoObj.owner.toString() != req.user?._id){
        throw new ApiError(400,'Unauthorized access to video')
    }

    const updateViews = await Video.findByIdAndUpdate(videoId,
        {
            $inc: {
                'views':1
            }
        }
    )

    if(!updateViews){
        throw new ApiError(400,'Either video not found or there was an error while updating the views')
    }

    const updateWatchHistory = await User.findByIdAndUpdate(req.user._id,{

            $push: {
                watchHistory: {
                    $each: [videoId],
                    $position: 0
                }
            }

    })
    if(!updateWatchHistory){
        throw new ApiError(500,'Error while updating watch history')
    }

    const video = await Video.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(videoId)
                },
            },
            {
                $lookup:{
                    from: 'users',
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'owner',
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1,
                                coverImage: 1
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
        ]
    )

    

    if(!video && !Array.isArray(video) && !(video.length>0) ){
        new ApiError(400,'No video found with id')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video[0],
            'Video fetched successfully'
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }
    
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnailUrl
    if(!videoId){
        throw new ApiError(400,'No video id found')
    }

    const oldVideo = await Video.findById(videoId)
    if(!oldVideo){
        throw new ApiError(404,'Video not found')
    }

    if(req.user?._id !== oldVideo.owner){
        throw new ApiError(400,'User not authorized to update the video')
    }

    const thumbnailLocalPath = req.file?.path

    if(!req.body.title && !req.body.description && !thumbnailLocalPath){
        throw new ApiError(400,'Atleast title,thumbnail or description is required')
    }

    const updateObj = {...req.body,thumbnail:''}
    
    if(thumbnailLocalPath){
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        

        updateObj.thumbnail = thumbnail.url

        if(!updateObj.thumbnail){
            new ApiError(500,'There was an error while uploading the new thumbnail on Cloudinary')
        }

        const deleteOldThumbnail = await deleteFromCloudinary(oldVideo.thumbnail)
        if(!deleteOldThumbnail){
            throw new ApiError(500,'There was an error while uploading the new thumbnail on Cloudinary')
        }
    }

    Object.keys(updateObj).forEach(k => updateObj[k] == '' && delete updateObj[k])

    const updateVideo = await Video.findByIdAndUpdate(videoId,updateObj)

    if(!updateVideo){
        throw new ApiError(500,'Either video does not exist or there was an error while upadting the values in DB')
    }

    const updatedVideo = await Video.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(videoId)
                }    
            },
            {
                $lookup:{
                    from:'users',
                    localField:'owner',
                    foreignField:'_id',
                    as:'owner',
                    pipeline: [
                        {
                            $project: {
                                username:1,
                                fullName:1,
                                avatar:1,
                                coverImage:1
                            }
                        }
                    ]
                },
            },
            {
                $addFields:{
                    owner: {
                        $first: '$owner'
                    }
                }
            }
        ]
    )

    if(!updatedVideo){
        throw new ApiError(500,'There was an error fetching video from DB')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedVideo[0],
            'Video updated successfully'
        )
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }

    const { videoId } = req.params
    //TODO: delete video
    if(!videoId){
        throw new ApiError(400,'No video id found')
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,'No video found')
    }

    const {videoFile,thumbnail} = video
    
    const videoDeleted = await deleteFromCloudinary(videoFile,'video')
    const thumbnailDeleted = await deleteFromCloudinary(thumbnail)
    if(!videoDeleted && !thumbnailDeleted){
        throw new ApiError(500,'There was an error while deleting video or thumbnail from cloudinary')
    }

    const deleteRes = await Video.findByIdAndDelete(videoId)
    if(!deleteRes){
        throw new ApiError(500,'There was an error deleting video from DB')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            'Video deleted successfully'
        )
    )
    
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }

    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400,'No video id specified')
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,'Video not found')
    }

    video.isPublished = !video.isPublished
    video.save()

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            'Video publish status toggled successfully'
        )
    )
    
    
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}