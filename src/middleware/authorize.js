require('dotenv').config()
const jwt = require("jsonwebtoken");

// /**
//  * 
//  * @typedef {object} User
//  * @property {string} id
//  * @property {string} email
//  * 
//  * @param {import('express').Request & { user: {id: string, email: string} | jwt.JwtPayload }} req 
//  * @param {import('express').Response} res 
//  * @returns {any}
//  */
module.exports = (req, res, next) => {
    const token = req.header('auth-token');
    if(!token || !token.startsWith('bearer')) res.status(401).send();

    try{
        const value = token.split(' ')[1];
        const verified = jwt.verify(value, process.env.TOKEN_KEY);
        //@ts-ignore
        // const { id, email, exp, iat } = verified;
        req.user = verified;
        next();
    }catch(e){
        return res.status(401).send("Invalid Token");
    }
}
