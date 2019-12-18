const mongoose = require('mongoose')
const Schema = mongoose.Schema
const time = require('../libs/timeLib')

const Mail= new Schema({
    id:{
        type:String,
    },
    senderName:{
        type:String
    },
    senderMail:{
        type:String
    },
    recieverMail:{
        type:String
    },
    subject:{
        type:String
    },
    content:{
        type:String
    },
    time: {
        type: Date,
        default: time.now()
      },
      read:{
          type:Boolean,
          default:false
      },
      image:{
          type:String
      }

})

module.exports = mongoose.model('Trash', Mail)
