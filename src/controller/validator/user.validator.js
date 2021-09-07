const joi = require('joi');


const createUser = joi.object({
    email: joi.string().required().email(),
    password: joi.string().required(),
});

module.exports = { createUser }
