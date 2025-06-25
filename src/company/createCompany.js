const express =require('express');
const bcrypt = require('bcryptjs');
const {body,validationResult}=require('express-validator');
const pool=require('../../config/db');
const router=express.Router();

const signupValidation=[
    body('email').isEmail().withMessage('Email invalide'),
    body('password')
        .isLength({min:8})
        .withMessage('le mot de passe doit contenir 8 caractére ou plus'),
    body 
]