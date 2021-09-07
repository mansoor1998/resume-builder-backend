const express = require('express');
const ResumeController = require('./resume.controller');
const UserController = require('./user.controller');

const apiRouter = () => {
    const router = express.Router();
    // contollers routing configuration.
    router.use('/resume', ResumeController());
    router.use('/user', UserController());

    return router;
}

module.exports = apiRouter;