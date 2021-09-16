require('dotenv').config()
const express = require('express');
const db = require('../database/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('../middleware/validator');
const { createUser } = require('./validator/user.validator');
const authorize = require('../middleware/authorize');

 

const UserController = () => {


    /**
     * 
     * @param { {id: string, email: string} } data 
     * @returns {string}
     */
    const signInToken = (data) => {
        const id = data.id;
        const email = data.email;

        return jwt.sign(
            { id:id, email: email },
            process.env.TOKEN_KEY,
            {
              expiresIn: "12h",
            }
        );
    }

    const hashPassword = async (password) => {
        const saltRounds = 10;
        try{
            const hash = await new Promise((res, rej) => {
                bcrypt.genSalt(saltRounds, (err, salt) => {
                    bcrypt.hash(password, salt,  async (err, hash) => {
                        res( hash );
                    })
                });    
            });
            
            return hash;
        }catch(e){
            throw e;
        }
    }

    const router = express.Router();

    router.get('isAuthorized', authorize ,async (req, res) => {
        //@ts-ignore
        // const { id: userId } = req.user;
        
        // const { User } = db;
        
        // const result = await User.findOne({
        //     where: {
        //         id: userId
        //     }
        // });

        if(result) return res.status(200).send({ message: "user is authorized" });
        // return res.status(401).send({ message: "user is unauthorized" }); 
    });

    router.post('/register', validator(createUser) , async (req, res) => {
        const { email, password } = req.body;
        const { User } = db;
        
        const user = await User.findOne({
            where: {
                email: email 
            }
        });


        if(user) return res.status(400).send({ "message": "user already exist" });

        try{
            const hash = await hashPassword(password);

            const build = User.build({
                email,
                password: hash
            });
            await build.save();    

            const token = signInToken({id: build.id, email: build.email});

            return res.status(200).send({
                jwt: token,
                isActive: build.isActive
            });

        }catch(err){
            return res.status(500).send(err);
        }

    });


    router.post( '/login', validator(createUser) ,async (req, res) => {
        const {email, password} = req.body;
        
        const {User} = db; 


        const user = await User.findOne({
            where: {
                email: email,
            },
            attributes: [
                'id', 'email', 'password'
            ]
        });

        if(!user) res.status(404).send({ "message": "Invalid Email or Password" });

        const validPass = await bcrypt.compare( password, user.password );

        if(!validPass) res.status(404).send({ "message": "Invalid Email or Password" });

        const token = signInToken({id: user.id, email: user.email});

        return res.status(200).send({
            jwt: token
        });
    });

    router.post('/authorized', authorize ,async (req, res) => {
        //@ts-ignore
        return res.status(200).send(req.user);
    });

    return router;
};

module.exports = UserController;