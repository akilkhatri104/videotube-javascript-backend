import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

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

const deleteFromCloudinary = async (imageUrl = "") => {
    try {
        if(!imageUrl){
            console.log("deleteFromCloudinary: No image url ");
            
            return null
        }
        const public_id = extractPublicId(imageUrl)  
        const response = await cloudinary.uploader.destroy(public_id,{
            resource_type:'image'
        })

        console.log(response);
        return response
    } catch (error) {
        console.error("deleteFromCloudinary: ",error.message);
        return null
    }
}

// Function to extract public ID from URL
function extractPublicId(url) {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    return parts[uploadIndex + 2].split('.')[0]; // Assumes public ID is before the file extension
}

export {uploadOnCloudinary,deleteFromCloudinary}