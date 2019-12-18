const mongoose = require('mongoose');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const validateInput = require('../libs/paramsValidationLib')
const check = require('../libs/checkLib')
const passwordLib = require('../libs/passwordLib');
const token = require('../libs/tokenLib');


/* Models */
const UserModel = mongoose.model('User')
const AuthModel = mongoose.model('AuthModel')
const MailModel = mongoose.model('Mail')
const TrashModel = mongoose.model('Trash')
const DraftModel = mongoose.model('Draft')

// start user signup function 

let signUpFunction = (req, res) => {
    UserModel.findOne({ email: req.body.email }, (err, details) => {
        if (err) {
            logger.error(err.message, 'userController: createUser', 10)
            let apiResponse = response.generate(true, 'Failed To Create User', 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(details)) {
            let newUser = new UserModel({
                userId: shortid.generate(),
                name: req.body.name,
                email: req.body.email.toLowerCase(),
                password: passwordLib.hashpassword(req.body.password)
            })
            newUser.save((err, newUser) => {
                if (err) {
                    logger.error(err.message, 'userController: createUser', 10)
                    let apiResponse = response.generate(true, 'Failed To Create User', 500, null)
                    res.send(apiResponse)
                } else {
                    let user = newUser.toObject()
                    res.send(user)
                }

            })
        } else {
            logger.error('User Cannot Be Created.User Already Present', 'userController: createUser', 4)
            let apiResponse = response.generate(true, 'User Already Present With this Email', 403, null)
            res.send(apiResponse)
        }
    })

}// end user signup function 


// start of login function 
let loginFunction = (req, res) => {
    let findUser = () => {
        return new Promise((resolve, reject) => {
            if (req.body.email) {
                UserModel.findOne({ email: req.body.email }, (err, userDetails) => {
                    /* handle the error here if the User is not found */
                    if (err) {
                        logger.error('Failed To Retrieve User Data', 'userController: findUser()', 10)
                        /* generate the error message and the api response message here */
                        let apiResponse = response.generate(true, 'Failed To Find User Details', 500, null)
                        reject(apiResponse)
                    } else if (check.isEmpty(userDetails)) {
                        /* generate the response and the console error message here */
                        logger.error('No User Found', 'userController: findUser()', 7)
                        let apiResponse = response.generate(true, 'No User Details Found', 404, null)
                        reject(apiResponse)
                    } else {
                        /* prepare the message and the api response here */
                        logger.info('User Found', 'userController: findUser()', 10)
                        resolve(userDetails)
                    }
                });

            } else {
                let apiResponse = response.generate(true, '"email" parameter is missing', 400, null)
                reject(apiResponse)
            }
        })
    }
    let validatePassword = (retrievedUserDetails) => {
        return new Promise((resolve, reject) => {
            passwordLib.comparePassword(req.body.password, retrievedUserDetails.password, (err, isMatch) => {
                if (err) {
                    logger.error(err.message, 'userController: validatePassword()', 10)
                    let apiResponse = response.generate(true, 'Login Failed', 500, null)
                    reject(apiResponse)
                } else if (isMatch) {
                    let retrievedUserDetailsObj = retrievedUserDetails.toObject()
                    delete retrievedUserDetailsObj.password
                    delete retrievedUserDetailsObj._id
                    delete retrievedUserDetailsObj.__v
                    delete retrievedUserDetailsObj.createdOn
                    delete retrievedUserDetailsObj.modifiedOn
                    resolve(retrievedUserDetailsObj)
                } else {
                    logger.info('Login Failed Due To Invalid Password', 'userController: validatePassword()', 10)
                    let apiResponse = response.generate(true, 'Wrong Password.Login Failed', 400, null)
                    reject(apiResponse)
                }
            })
        })
    }

    let generateToken = (userDetails) => {
        return new Promise((resolve, reject) => {
            token.generateToken(userDetails, (err, tokenDetails) => {
                if (err) {
                    let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                    reject(apiResponse)
                } else {
                    tokenDetails.userId = userDetails.userId
                    tokenDetails.userDetails = userDetails
                    resolve(tokenDetails)
                }
            })
        })
    }
    let saveToken = (tokenDetails) => {
        return new Promise((resolve, reject) => {
            AuthModel.findOne({ userId: tokenDetails.userId }, (err, retrievedTokenDetails) => {
                if (err) {
                    let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(retrievedTokenDetails)) {
                    let newAuthToken = new AuthModel({
                        userId: tokenDetails.userId,
                        authToken: tokenDetails.token,
                        tokenSecret: tokenDetails.tokenSecret,
                        tokenGenerationTime: time.now()
                    })
                    newAuthToken.save((err, newTokenDetails) => {
                        if (err) {
                            logger.error(err.message, 'userController: saveToken', 10)
                            let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                            reject(apiResponse)
                        } else {
                            let responseBody = {
                                authToken: newTokenDetails.authToken,
                                userDetails: tokenDetails.userDetails

                            }
                            resolve(responseBody)
                        }
                    })
                } else {
                    retrievedTokenDetails.authToken = tokenDetails.token
                    retrievedTokenDetails.tokenSecret = tokenDetails.tokenSecret
                    retrievedTokenDetails.tokenGenerationTime = time.now()
                    retrievedTokenDetails.save((err, newTokenDetails) => {
                        if (err) {
                            logger.error(err.message, 'userController: saveToken', 10)
                            let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                            reject(apiResponse)
                        } else {
                            let responseBody = {
                                authToken: newTokenDetails.authToken,
                                userDetails: tokenDetails.userDetails
                            }
                            resolve(responseBody)
                        }
                    })
                }
            })
        })
    }

    findUser(req, res)
        .then(validatePassword)
        .then(generateToken)
        .then(saveToken)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'Login Successful', 200, resolve)
            res.status(200)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.status(err.status)
            res.send(err)
        })
}

// end of the login function 

let logout = (req, res) => {
    AuthModel.findOneAndRemove({ userId: req.user.userId }, (err, result) => {
        if (err) {
            logger.error(err.message, 'user Controller: logout', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(result)) {
            let apiResponse = response.generate(true, 'Already Logged Out or Invalid UserId', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Logged Out Successfully', 200, null)
            res.send(apiResponse)
        }
    })
} // end of the logout function.

//send mail

let sendMail = (req, res) => {
    UserModel.findOne({ 'email': req.body.recieverMail }, (err, user) => {
        if (err) {
            logger.error(err.message, 'user Controller: sendmail', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(user)) {
            let apiResponse = response.generate(true, 'user not found', 404, null)
            res.send(apiResponse)
        } else {
            let mail = new MailModel({
                id: shortid.generate(),
                senderName: req.body.name,

                senderMail: req.body.senderMail,

                recieverMail: req.body.recieverMail,

                subject: req.body.subject,

                content: req.body.content,

                read: req.body.read,

                time: time.now(),

                image: req.file.path
            })
            mail.save((err, mail) => {
                if (err) {
                    logger.error(err.message, 'sentMail', 10)
                    let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
                    res.send(apiResponse)
                } else {
                    let apiResponse = response.generate(false, 'Mail sent', 200, mail)
                    res.send(apiResponse)
                }
            })
        }
    })


}

let inbox = (req, res) => {
    MailModel.find({ 'recieverMail': req.params.mail }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller: inbox', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'no mail in inbox', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'mails found inbox', 200, mails)
            res.send(apiResponse)
        }
    })
}

let sent = (req, res) => {
    MailModel.find({ 'senderMail': req.params.mail }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller:sent', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'no mail in inbox', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'mails found inbox', 200, mails)
            res.send(apiResponse)
        }
    })
}

let trash = (req, res) => {

    let save = () => {
        return new Promise((resolve, reject) => {
            MailModel.findOne({ 'id': req.params.id }, (err, mails) => {
                if (err) {
                    logger.error(err.message, 'user Controller: trash', 10)
                    let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(mails)) {
                    let apiResponse = response.generate(true, 'no mail in trash', 404, null)
                    reject(apiResponse)
                } else {
                    let data = mails.toObject()
                    let mail = new TrashModel({
                        id: data.id,
                        senderName: data.name,

                        senderMail: data.senderMail,

                        recieverMail: data.recieverMail,

                        subject: data.subject,

                        content: data.content,

                        read: data.read,

                        time: data.time,

                        image: data.image
                    })
                    mail.save((err, mail) => {
                        if (err) {
                            logger.error(err.message, 'userController: trash', 10)
                            let apiResponse = response.generate(true, 'Failed To save', 500, null)
                            reject(apiResponse)
                        } else {
                            resolve(mail)
                        }
                    })
                }
            })
        })
    }

    let remove = (mail) => {
        return new Promise((resolve, reject) => {
            MailModel.remove({ 'id': mail.id }, (err, mails) => {
                if (err) {
                    logger.error(err.message, 'user Controller: remove', 10)
                    let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(mails)) {
                    let apiResponse = response.generate(true, 'no mail in inbox', 404, null)
                    reject(apiResponse)
                } else {
                    resolve(mails)
                }
            })

        })
    }


    save(req, res)
        .then(remove)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'trashed successfully', 200, resolve)
            res.status(200)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.status(err.status)
            res.send(err)
        })

}


let getTrash = (req, res) => {
    TrashModel.find({ 'recieverMail': req.params.mail }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller: getTrash', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'no mail in trash', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'mails found trash', 200, mails)
            res.send(apiResponse)
        }
    })
}



let DraftMail = (req, res) => {

    let mail = new DraftModel({
        id: shortid.generate(),
        senderName: req.body.name,

        senderMail: req.body.senderMail,

        recieverMail: req.body.recieverMail,

        subject: req.body.subject,

        content: req.body.content,

        read: req.body.read,

        time: time.now(),

    })
    mail.save((err, mail) => {
        if (err) {
            logger.error(err.message, 'userController: draft', 10)
            let apiResponse = response.generate(true, 'Failed to save', 500, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Mail drafted', 200, mail)
            res.send(apiResponse)
        }
    })
}

let getDraft = (req, res) => {
    DraftModel.find({ 'senderMail': req.params.mail }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller: getDraft', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'no mail in draft', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'mails found draft', 200, mails)
            res.send(apiResponse)
        }
    })
}

let viewDraft = (req, res) => {
    DraftModel.findOne({ 'id': req.body.id }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller: viewDraft', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'no mail ', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'mails found', 200, mails)
            res.send(apiResponse)
        }
    })
}

let viewMailInbox = (req, res) => {

    let updateView = () => {
        return new Promise((resolve, reject) => {
            MailModel.findOneAndUpdate({ 'id': req.params.id }, { $set: { read: true } }, { new: true }, (err, mails) => {
                if (err) {
                    logger.error(err.message, 'user Controller: viewMailInbox', 10)
                    let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(mails)) {
                    let apiResponse = response.generate(true, 'mail not found', 404, null)
                    reject(apiResponse)
                } else {
                    resolve(mails)
                }
            })
        })
    }

    let find = (mails) => {
        return new Promise((resolve, reject) => {
            MailModel.find({ $or: [{ 'id': mails.id }, { 'replyId': mails.id }] }, (err, mails) => {
                if (err) {
                    logger.error(err.message, 'user Controller: viewMailInbox', 10)
                    let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
                    reject(apiResponse)
                } else if (check.isEmpty(mails)) {
                    let apiResponse = response.generate(true, 'mail not found', 404, null)
                    reject(apiResponse)
                } else {
                    resolve(mails)
                }
            })
        })
    }


    updateView(req, res)
        .then(find)
        .then((resolve) => {
            let apiResponse = response.generate(false, 'mail found', 200, resolve)
            res.status(200)
            res.send(apiResponse)
        })
        .catch((err) => {
            res.status(err.status)
            res.send(err)
        })
}

let viewMail = (req, res) => {
    MailModel.findOne({ 'id': req.params.id }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller: viewMail', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'mail not found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'mail found', 200, mails)
            res.send(apiResponse)
        }
    })
}

let viewTrashMail = (req, res) => {
    TrashModel.findOne({ 'id': req.params.id }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller: viewTrashMail', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'mail not found', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'mail found', 200, mails)
            res.send(apiResponse)
        }
    })
}

let deleteFromTrash = (req, res) => {
    TrashModel.remove({ 'id': req.body.id }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller: deleteFromTrash', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'no mail in inbox', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'deleted', 200, mails)
            res.send(apiResponse)
        }
    })
}
let deleteFromDraft = (req, res) => {
    DraftModel.remove({ 'id': req.body.id }, (err, mails) => {
        if (err) {
            logger.error(err.message, 'user Controller: deleteDraft', 10)
            let apiResponse = response.generate(true, `error occurred: ${err.message}`, 500, null)
            res.send(apiResponse)
        } else if (check.isEmpty(mails)) {
            let apiResponse = response.generate(true, 'no mail in inbox', 404, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'deleted', 200, mails)
            res.send(apiResponse)
        }
    })
}

let reply = (req, res) => {

    let mail = new MailModel({
        id: shortid.generate(),
        senderName: req.body.name,

        senderMail: req.body.senderMail,

        recieverMail: req.body.recieverMail,

        subject: req.body.subject,

        content: req.body.content,

        read: req.body.read,

        time: time.now(),

        image: req.file.path,
        replyId: req.body.id
    })
    mail.save((err, mail) => {
        if (err) {
            logger.error(err.message, 'userController: reply', 10)
            let apiResponse = response.generate(true, 'Failed To Generate Token', 500, null)
            res.send(apiResponse)
        } else {
            let apiResponse = response.generate(false, 'Mail sent', 200, mail)
            res.send(apiResponse)
        }
    })


}

module.exports = {

    signUpFunction: signUpFunction,
    loginFunction: loginFunction,
    logout: logout,
    sendMail: sendMail,
    inbox: inbox,
    sent: sent,
    trash: trash,
    getTrash: getTrash,
    DraftMail: DraftMail,
    getDraft: getDraft,
    viewMailInbox: viewMailInbox,
    viewMail: viewMail,
    viewTrashMail: viewTrashMail,
    deleteFromTrash: deleteFromTrash,
    viewDraft: viewDraft,
    deleteFromDraft: deleteFromDraft,
    reply: reply

}// end exports