import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, updateUserAvatar, changeCurrentPassword, updateUserCoverImage, getCurrentUser, updateAccountDetails } from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1    
        }
    ]),
    registerUser
)

router.route('/login').post(loginUser)

//secured routes
router.route('/logout').post(verifyJWT,logoutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('/update-avatar').post(
    upload.single('avatar'),
    verifyJWT,
    updateUserAvatar
)
router.route('/update-coverimage').post(
    upload.single('coverImage'),
    verifyJWT,
    updateUserCoverImage
)
router.route('/change-password').post(
    verifyJWT,
    changeCurrentPassword
)
router.route('/get-user').get(
    verifyJWT,
    getCurrentUser
)
router.route('/update-account-details').post(
    verifyJWT,
    updateAccountDetails
)

export default router