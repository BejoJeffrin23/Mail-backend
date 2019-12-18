'use strict'
/**
 * Module Dependencies
 */
const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

let userSchema = new Schema({
  userId: {
    type: String,
    default: '',
    index: true,
    unique: true
  },
  name: {
    type: String,
    default: ''
 
  },
  password: {
    type: String,
    default: 'password'
  },
  email: {
    type: String,
    default: ''
  }


})


mongoose.model('User', userSchema);