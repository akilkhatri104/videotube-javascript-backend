import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
import ApiError from './ApiError.js';
import { format } from 'path';

// Configuration
cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto'
        })
        // console.log("Clodinary response: ",response);
        
        //file has been uploaded successfully
        // console.log('file is uploaded on Cloudinary: ',response.url)
        fs.unlinkSync(localFilePath)
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temp file as the upload operation got failed
        return null
    }
}

const deleteFromCloudinary = async (url = "",resource_type='image') => {
    try {
        if(!url){
            console.log("deleteFromCloudinary: No url ");
            
            return null
        }
        
        const public_id = extractPublicId(url)

        const response = await cloudinary.uploader.destroy(public_id,{
            resource_type: resource_type
        })

        if(!response || response.result !== 'ok'){
            console.log("deleteFromCloudinary: Error while deleting from cloudinary");
        }
        console.log("deleteFromCloudinary: ",response);
        

        return response
    } catch (error) {
        console.error("deleteFromCloudinary: ",error.message);
        return null
    }
}

// const generateThumbnail = async(video) => {
//     try {
//         if(!video){
//             console.log("generateThumbnail: No video object ");
//             return null
//         }

//         const randomOffset = Math.floor(Math.random() * Number(video.duration))

//         const thumbnailUrl = cloudinary.url(video.public_id,{
//             resource_type: 'video',
//             transformation: [
//                 {
//                     width: 300,
//                     height: 200,
//                     crop: 'fill',
//                     format:'jpg'
//                 },
//                 {start_offset: randomOffset}
//             ]
//         })
        
//         if(!thumbnailUrl){
//             throw new ApiError(500,'Error while generating video thumbnail')
//         }

//         console.log('Thumbnail URL:', thumbnailUrl);
//         return thumbnailUrl
//     } catch (error) {
//         console.log("generateThumbnail: ",error.message);
//         return null
//     }
// }

const generateThumbnail = (video) => {
    const randomOffset = Math.floor(Math.random() * Number(video.duration))

    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/c_fill,h_200,w_300/so_${randomOffset}/${video.public_id}.jpg`
}

// Function to extract public ID from URL
function extractPublicId(url) {
    const parts = url.split('/');
    // Assuming the public ID is the last part before the extension
    const publicIdWithExtension = parts[parts.length - 1];
    const publicId = publicIdWithExtension.split('.')[0];
    console.log("extractPublicId: ",publicId);
    
    return publicId;
}

export {uploadOnCloudinary,deleteFromCloudinary,generateThumbnail}