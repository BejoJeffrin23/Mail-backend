const express = require('express');
const router = express.Router();
const userController = require("./../../app/controllers/userController");
const appConfig = require("./../../config/appConfig")
const auth = require('./../middlewares/auth')
const multer=require('multer')


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname)
    }
})


const upload = multer({
    storage: storage
})


module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/users`;

    // defining routes.


    // params: name, email,password
    app.post(`${baseUrl}/signup`, userController.signUpFunction);


    // params: email, password.
    app.post(`${baseUrl}/login`, userController.loginFunction);

   // params: email, password.
   app.post(`${baseUrl}/send`,upload.single('image'), userController.sendMail);

    // auth token params: userId.
    app.post(`${baseUrl}/logout`,auth.isAuthorized, userController.logout);

    app.get(`${baseUrl}/:mail/all`,userController.inbox);

    app.get(`${baseUrl}/:mail/sentMail`,userController.sent)

    app.get(`${baseUrl}/:id/trash`,userController.trash)

    app.get(`${baseUrl}/:mail/gettrash`,userController.getTrash)

    app.post(`${baseUrl}/draft`, userController.DraftMail);

    app.get(`${baseUrl}/:mail/getDraft`,userController.getDraft)

    app.get(`${baseUrl}/:id/viewMailInbox`,userController.viewMailInbox)

    app.get(`${baseUrl}/:id/viewMail`,userController.viewMail)

    app.get(`${baseUrl}/:id/viewTrashMail`,userController.viewTrashMail);

    app.post(`${baseUrl}/removePermanent`, userController.deleteFromTrash);

    app.post(`${baseUrl}/viewDraft`,userController.viewDraft)

    app.post(`${baseUrl}/deleteDraft`, userController.deleteFromDraft);

    app.post(`${baseUrl}/reply`,upload.single('image'),userController.reply)


}
