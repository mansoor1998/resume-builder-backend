require('dotenv').config()
const express = require('express');
const db = require('../database/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('../middleware/validator');
const { createUser } = require('./validator/user.validator');
const authorize = require('../middleware/authorize');
const { getGoogleAuthUrl, getGoogleUserData } = require('../../utilities/google-util');

const {OAuth2Client} = require('google-auth-library');
 

const UserController = () => {

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const router = express.Router();


    /**
     * 
     * @param { {id: string, email: string, verified: boolean, isGoogleAuth: boolean} } data 
     * @returns {string}
     */
    const signInToken = (data) => {
        const id = data.id;
        const email = data.email;

        try{
            return jwt.sign(
                { id:id, email: email },
                process.env.TOKEN_KEY,
                {
                  expiresIn: "12h",
                }
            );    
        } catch(e) {
            throw e;
        }

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

            const token = signInToken({id: build.id, email: build.email, verified: build.verified, isGoogleAuth: build.isGoogleAuth});

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
                'id', 'email', 'password', 'verified', 'isGoogleAuth'
            ]
        });

        if(!user || !user?.password) res.status(404).send({ "message": "Invalid Email or Password" });

        const validPass = await bcrypt.compare( password, user.password );

        if(!validPass) res.status(404).send({ "message": "Invalid Email or Password" });

        const token = signInToken({id: user.id, email: user.email, verified: user.verified, isGoogleAuth: user.isGoogleAuth});

        return res.status(200).send({
            jwt: token
        });
    });

    router.post('/authorized', authorize ,async (req, res) => {
        //@ts-ignore
        return res.status(200).send(req.user);
    });

    router.get('/openauth/google', async (req, res) => {
        const url = getGoogleAuthUrl();
        res.send(url);
    });

    router.post('/openauth/login', async (req, res)=> {
        const { accessToken } = req.body;

        const { User } = db;

        let ticket = null;

        try{
            ticket = await client.verifyIdToken({
                idToken : accessToken,
                audience : process.env.GOOGLE_CLIENT_ID
            });    
        }catch(e) {
            return res.status(500).send({ message: "Internal Server Error" });
        }

        
        const payload = ticket.getPayload();

        const email = payload['email'];
        const firstName = payload['given_name'];
        const lastName = payload['family_name'];


        let user = await User.findOne({
            where: {
                email: email
            }
        });


        if (user && !user?.isGoogleAuth) {
            return res.status(424).send({ "message": "The email has already been registered" });
        }


        if(!user) {
            user = User.build({
                email: email,
                verified: true,
                isGoogleAuth: true
            });
            await user.save();    
        }

        try{
            const token = signInToken({id: user.id, email: user.email, verified: user.verified, isGoogleAuth: user.isGoogleAuth});

            return res.status(200).send({
                jwt: token,
                isActive: user.isActive
            });
        } catch(e){
            return res.status(500).send({ "message": "Internal Server Error" });
        }
    })

    router.get('/callback', async (req, res) => {
        res.send();
    })

    return router;
};

module.exports = UserController;