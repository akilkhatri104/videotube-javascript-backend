import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {User} from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import ApiError from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { app } from "../app.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to create a playlist')
    }

    if(!name && !description){
        throw new ApiError(400,'Name and description are required to create a playlist')
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })

    if(!playlist){
        throw new ApiError(500,'There was an error while creating the playlist')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            'Playlist created successfully'
        )
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in')
    }

    if(!isValidObjectId(userId)){
        throw new ApiError(400,'Invalid user id')
    }


    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                isPublic: true
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'videos',
                foreignField: '_id',
                as: 'videos'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [
                    {
                        $project:{
                            _id:1,
                            fullName:1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first: '$owner'
                }
            }
        }
    ])

    if(!playlists || playlists.length == 0){
        throw new ApiError(404,'No playlists found')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlists,
            'Playlists fetched successfully'
        )
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to get a playlist')
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,'Invalid playlist id')
    }

    const playlistExists = await Playlist.findById(playlistId)
    if(!playlistExists){
        throw new ApiError(404,'Playlist not found')
    }

    if(!playlistExists.isPublic && playlistExists.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,'Unauthorized request')
        
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:'users',
                localField:'owner',
                foreignField:'_id',
                as:'owner',
                pipeline:[
                    {
                        $project:{
                            _id:1,
                            _username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'videos',
                foreignField: '_id',
                as: 'videos'
            }
        },
        {
            $addFields:{
                owner:{
                    $first: '$owner'
                }
            }
        }
    ])

    if(!playlist || playlist.length == 0){
        throw new ApiError(404,'No playlist found')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist[0],
            'Playlist fetched succesfully'
        )
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to add video to playlist')
    }

    if(!isValidObjectId(playlistId) && !isValidObjectId(videoId)){
        throw new ApiError(400,'playlist id or video is invalid')
    }

    const playlistExists = await Playlist.findById(playlistId)
    if(!playlistExists){
        throw new ApiError(404,'No playlist found')
    }

    if(playlistExists.owner.toString() != req.user._id){
        throw new ApiError(400,'User is not authorized to modify the playlist')
    }

    const videoExists = await Video.findById(videoId)
    if(!videoExists){
        throw new ApiError(404,'No video found')
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $push: {
                videos: videoId
        }
        },
        {new:true}
    ).populate('owner','-password -refreshToken -watchHistory -_v')

    if(!updatedPlaylist){
        throw new ApiError(500,'Error while updating the playlist')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            'Playlist updated successfully'
        )
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in')
    }

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400,'Invalid playlist id or video id')
    }

    const videoPromise = Video.findById(videoId)
    const playlistPromise = Playlist.findById(playlistId)

    const videoExists = await videoPromise
    const playlistExists = await playlistPromise

    if(!videoExists || !playlistExists){
        throw new ApiError(404,'Either video or playlist does not exist')
    }

    if(playlistExists.owner.toString() != req.user?._id.toString()){
        throw new ApiError(400,'Unauthorized request')
    }

    playlistExists.videos = playlistExists.videos.filter(id => id.toString() !== videoId)
    await playlistExists.save()

    return res
    .json(
        new ApiResponse(
            200,
            playlistExists,
            'Video removed successfully'
        )
    )

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!req.user){
        throw new ApiError(400,'Unauthorized access')
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,'Invalid playlist id provided')
    }

    const playlistExists = await Playlist.findById(playlistId)
    if(!playlistExists){
        throw new ApiError(404,'No playlist found')
    }

    if(playlistExists.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,'User needs to be owner inorder to delete the playlist')
    }

    const deleteRes = await Playlist.findByIdAndDelete(playlistId)
    if(!deleteRes){
        throw new ApiError(500,'There might have been some error while deleting the playlist')
    } 

    return res
    .json(
        new ApiResponse(
            200,
            {},
            'Playlist deleted succesfully'
        )
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!req.user){
        throw new ApiError(400,'Unauthorized access, user needs to be logged in')
    }

    if(!isValidObjectId(playlistId) || !name || !description){
        throw new ApiError(400,'Invalid playlist id or name or description')
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400,'Invalid user id')
    }

    const playlistExists = await Playlist.findById(playlistId)
    if(!playlistExists){
        throw new ApiError(404,'No playlist found')
    }

    if(!playlistExists.isDefaultPlaylist){
        throw new ApiError(400,'User is not authorized to modify the playlist')
    }

    if(playlistExists.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,'User needs to be owner of playlist to update it')
    }

    playlistExists.name = name
    playlistExists.description = description
    await playlistExists.save()

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:'users',
                localField:'owner',
                foreignField:'_id',
                as:'owner',
                pipeline:[
                    {
                        $project:{
                            _id:1,
                            _username:1,
                            fullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'videos',
                foreignField: '_id',
                as: 'videos'
            }
        },
        {
            $addFields:{
                owner:{
                    $first: '$owner'
                }
            }
        }
    ])

    if(!playlist || playlist.length == 0){
        throw new ApiError(500,'There was an error fetching the updated playlist')
    }

    return res
    .json(
        new ApiResponse(
            200,
            playlist[0],
            "playlist updated successfully"
        )
    )
})

const togglePlalistVisiblity = asyncHandler(async (req,res) => {
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,'Invalid playlist id')
    }

    const playlistExists = await Playlist.findById(playlistId)
    if(!playlistExists){
        throw new ApiError(404,'No playlist found')
    }

    if(playlistExists.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,'User needs to be owner of playlist to update it')
    }

    playlistExists.isPublic = !playlistExists.isPublic
    await playlistExists.save()

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlistExists,
            'Playlist updated successfully'
        )
    )
})

const savePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: save playlist
    if(!req.user){
        throw new ApiError(400,'Unauthorized access')
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,'Invalid playlist id provided')
    }

    const playlistExists = await Playlist.findById(playlistId)
    if(!playlistExists){
        throw new ApiError(404,'No playlist found')
    }

    const user = await User.findById(req.user._id)
    if(!user){
        throw new ApiError(404,'No user found')

    }

    user.savedPlaylists.push(playlistId)
    await user.save()
    return res
    .json(
        new ApiResponse(
            200,
            {},
            'Playlist saved successfully'
        )
    )
})

const unsavePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: unsave playlist
    if(!req.user){
        throw new ApiError(400,'Unauthorized access')
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,'Invalid playlist id provided')
    }

    const playlistExists = await Playlist.findById(playlistId)
    if(!playlistExists){
        throw new ApiError(404,'No playlist found')
    }

    const user = await User.findById(req.user._id)
    if(!user){
        throw new ApiError(404,'No user found')
    }

    user.savedPlaylists.pull(playlistId)
    await user.save()
    return res
    .json(
        new ApiResponse(
            200,
            {},
            'Playlist unsaved successfully'
        )
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    togglePlalistVisiblity,
    savePlaylist,
    unsavePlaylist
}