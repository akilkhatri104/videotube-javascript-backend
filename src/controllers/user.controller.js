import {asyncHandler} from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import otpGenerator from 'otp-generator'
import { OTP } from '../models/otp.model.js'

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({validateBeforeSave : false})

        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,'Something went wrong while generating Access and Refresh tokens')
    }
}

const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists - username, email
    // check for images, check for avatar
    // upload them to cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from respponse
    // check for user creation
    // return res

    const {fullName,email,username,password} = req.body
    // console.log("Request Body: ",req.body);
    
    if (
        [fullName,email,username,password].some( field => field?.trim() === "" )
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existingUser = await User.findOne({
        $or: [{ email },{ username }]
    })

    if(existingUser){
        throw new ApiError(409,"User with email or username already exists")
    }
    // console.log('Request Object: ',req);
    
    console.log("Request Files: ",req.files);
    
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    
    // console.log("User Model: ",user);
    
    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!userCreated){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201,userCreated,"User was registered successfully")
    )
} )

const loginUser = asyncHandler( async  (req,res) => {
    // get user details - username/email and password
    // validation - not empty
    // check if user exists
    // authenticate user details - check if password is correct
    // if details correct grant an access token and refresh token to the user
    // once the access token expires check if user's refresh token is same as db
    // login complete

    const { email,username,password } = req.body
    
    if(!username && !email){
        throw new ApiError(400,'You need either username or email to login')
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,'User does not exist')
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,'Invalid user credentials')
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie('accessToken',accessToken,options)
    .cookie('refreshToken',refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
            user: loggedInUser,
            accessToken,
            refreshToken
            },
            'User logged in successfully'
        )
    )
})

const logoutUser = asyncHandler( async(req,res)  => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie('accessToken',options)
    .clearCookie('refreshToken',options)
    .json(
        new ApiResponse(200,{},'User logged out successfully')
    )
    
})

const refreshAccessToken = asyncHandler( async(req,res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken 
    
        if(!incomingRefreshToken){
            throw new ApiError(401,"Unauthorized request")
        }
    
        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedRefreshToken?._id)
    
        if(!user){
            throw new ApiError(401,'Invalid Refresh Token')
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,'Refresh token is expired or used')
        }
    
        const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        return res
        .status(200)
        .cookie('accessToken',accessToken,options)
        .cookie('refreshToken',refreshToken,options)
        .json(
            new ApiResponse(200,
                {
                accessToken,
                refreshToken
                },
               'Access token refreshed successfully' 
            )
        )
    } catch (error) {
        throw new ApiError(401,error.message || 'error during refreshing access token')
    }
    
} )

const changeCurrentPassword = asyncHandler( async(req,res) => {
    const {oldPassword,newPassword} = req.body
    
    if(!req.user){
        throw new ApiError(400,'Did not receive User in request body')
    }

    const user = await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(500,'Error while fetching user from DB')
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,'Invalid old password')
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},'Password changes successfully')
    )
} )

const getCurrentUser = asyncHandler( async(req,res) => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,req.user,'Current user fetched successfully'
        )
    )
} )

const updateAccountDetails = asyncHandler(async(req,res) => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }
    const {email,fullName} = req.body

    if(!fullName || !email){
        throw new ApiError(400,'Both fields are required')
    }

    const checkUserExists = User.findOne({email})
    console.log("Check: ",checkUserExists.email);
    

    if(checkUserExists.email === email){
        throw new ApiError(400,'Email already in use')
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}
    ).select('-password')

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,user,'Account details updated successfully'
        )
    )
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }
    
    const newAvatarLocalPath = req.file?.path

    if(!newAvatarLocalPath){
        new ApiError(400,"Avatar file is missing")
    }

    if(!req.user){
        new ApiError(400,'User not found')
    }
    console.log("Request User",req.user.username);
    
    const oldAvatarToBeDeleted = req.user.avatar
    const avatar = await uploadOnCloudinary(newAvatarLocalPath)

    if(!avatar.url){
        new ApiError(500,'Error while uploading avatar')
    }
    console.log("URL of new avatar on Cloudinary: ",avatar.url);
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new:true}
    ).select('-password')

    if(!user){
        throw new ApiError(500,'Error while finding User from database')
    }
    console.log("User fetched from DB: ",user);
    

    const response = await deleteFromCloudinary(oldAvatarToBeDeleted)
    console.log("Cloudinary deletion reponse: ",response);
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "User avatar updated succesfully"
        )
    )
})

const updateUserCoverImage = asyncHandler(async(req,res) => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }
    
    const newCoverImageLocalPath = req.file?.path

    if(!newCoverImageLocalPath){
        throw new ApiError(400,'Cover image is missing')
    }

    const oldCoverImageToBeDeleted = req.user.coverImage
    const coverImage = await uploadOnCloudinary(newCoverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(500,'Error while uploading Cover Image on Cloudinary')
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new:true}
    ).select('-password')
    
    if(!user){
        throw new ApiError(500,'Error while setting Cover Image or fetching user in DB')
    }

    const response = await deleteFromCloudinary(oldCoverImageToBeDeleted)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            'User cover image updated successfully'
        )
    )
})

const getUserChannelProfile = asyncHandler(async(req,res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400,'Username is missing from params')
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCound: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond :{
                        if: {$in: [req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelSubscribedToCound: 1,
                isSubscribed: 1
            }
        }
    ])

    if(!channel?.length) {
        throw new ApiError(404,'Channel does not exist')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            'User channel fetched successfully'
        )
    )
})

const getWatchHistory = asyncHandler(async(req,res) => {
    if(!req.user){
        throw new ApiError(400,'User not logged in')
    }
    
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            },            
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
        
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

const sendEmailVerificationOTP = asyncHandler(async (req,res) => {

    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to verify their email')
    }

    if(req.user?.isEmailVerified === true){
        throw new ApiError(400,'Email already verified')
    }

    let otp = otpGenerator.generate(6,{
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
    })
    let result = await OTP.findOne({otp: otp})
    while(result){
        let otp = otpGenerator.generate(6,{
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        })
        result = await OTP.findOne({otp: otp})
    }

    let otpCreated = await OTP.create({email: req.user?.email,otp: otp})
    if(!otpCreated){
        throw new ApiError(500,'There was an error while sending OTP')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            'OTP sent succesfully'
        )
    )
})

const verifyEmailVerificationOTP = asyncHandler(async (req,res) => {
    if(!req.user){
        throw new ApiError(400,'User needs to be logged in to verify OTP')
    }

    if(req.user?.isEmailVerified === true){
        throw new ApiError(400,'Email already verified')
    }

    const otp = req.body?.otp.trim()

    if(!otp || otp.length != 6 || !/^[0-9]+$/.test(otp)){
        throw new ApiError(400,'OTP must contain 6 digits')
    }

    const isOTPValid = await OTP.find({email: req.user?.email}).sort({createdAt: -1}).limit(1)
    if(isOTPValid.length === 0 || otp !== isOTPValid[0].otp){
        throw new ApiError(400,'The OTP is invalid')
    }

    const response = await User.findByIdAndUpdate(req.user?._id,{
        isEmailVerified: true
    },{new:true}).select('-password -refreshToken')

    if(!response){
        throw new ApiError(500,'There was an error while verifying email')
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            response,
            'Email verifyied succesfully'
        )
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    sendEmailVerificationOTP,
    verifyEmailVerificationOTP
}