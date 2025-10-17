import express from 'express'
import { getUserData, loginUser, registerUser, updateProfile, submitReview, getReviews, getMyReview, updateReview, deleteReview, getNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../controllers/userController.js';
import authUser from '../middleware/authUser.js';
import upload from '../middleware/multer.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.get('/get-profile', authUser, getUserData)
userRouter.post('/update-profile', upload.single('image'), authUser, updateProfile)

// Review routes
userRouter.post('/submit-review', authUser, submitReview)
userRouter.get('/reviews', getReviews)
userRouter.get('/my-review', authUser, getMyReview)
userRouter.put('/update-review', authUser, updateReview)
userRouter.delete('/delete-review', authUser, deleteReview)

// Notification routes
userRouter.get('/notifications', authUser, getNotifications)
userRouter.get('/notifications/unread-count', authUser, getUnreadNotificationCount)
userRouter.put('/notifications/:notificationId/read', authUser, markNotificationAsRead)
userRouter.put('/notifications/mark-all-read', authUser, markAllNotificationsAsRead)
userRouter.delete('/notifications/:notificationId', authUser, deleteNotification)

export default userRouter;