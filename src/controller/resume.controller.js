const express = require('express');
const db = require('../database/models');
const ejs = require('ejs');
const authorize = require('../middleware/authorize');
const appRoot = require('path').resolve('./');
const util = require('util');
const fs = require('fs');
const makeDir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const puppeteer = require('puppeteer');
const verifyRules = require('../../utilities/verify-rules');
const sharp = require('sharp');
const { google } = require('googleapis');



// const { Sequelize } = require('sequelize');

const ResumeController = () => {

    const router = express.Router();

    router.post('/start', async (req, res) => {
        return res.status(200).send('hello world');
    });

    router.post('/create', async (req, res) => {
        const { Resume } = db;
        const { fileName, imagePath } = req.body;
        const resume = Resume.build({
            fileName: fileName,
            imagePath: imagePath
        });

        await resume.save();

        res.send( resume );
    });

    router.get('/getall' , async (req, res) => {
        const { Resume } = db;
        const resume = await Resume.findAll();

        res.send(resume);
    });

    router.get('/getById', authorize, async (req,res) => {
        const { id: resumeId } = req.query;
        const { Resume } = db;
        const resume = await Resume.findOne({
            where: {
                id: resumeId 
            }
        });

        return res.status(200).send(resume);
    });

    router.get('/get-all-userresumes', authorize , async (req, res) => {
        const { UserResume, Resume } = db;
        //@ts-ignore
        const {id: userId} = req.user;

        try{
            const resumes = await UserResume.findAll({
                where: {
                    userId: userId
                },
                include: [
                    {
                        model: Resume,
                        attributes: []
                    }
                ],
                attributes: [ 
                    'id', 'userId', 'resumeId', 'htmlFile' ,'createdAt', 'updatedAt', [ 'imagePath', 'userResumeImagePath' ],
                    [ db.Sequelize.literal('"Resume"."imagePath"'), 'imagePath' ], 
                    [ db.Sequelize.literal('"Resume"."fileName"'), 'fileName' ]  
                ],
                order: [ ['createdAt', 'DESC'] ]
            });
    
            return res.send(resumes);    
        }catch( err ){
            return res.status(500).send({
                name: err.name,
                message: err.message
            });
        }
    });

    router.get('/get-userresume-id', authorize, async (req, res) => {
        const { id: userResumeId } = req.query;
        //@ts-ignore
        const { id: userId } = req.user;
        const { UserResume, Resume } = db;

        try{
            const result = await UserResume.findOne({
                where: {
                    id: userResumeId
                },
                include: [
                    {
                        model: Resume
                    }
                ]
            });

            return res.send(result);
        }catch(err){
            return res.status(500).send({
                name: err.name,
                message: err.message
            });
        }

    });

    router.post('/get-resume-layout', authorize , async (req, res) => {
        const bodyJson = req.body;
        const { id: resumeId } = req.query;

        const { Resume } = db;

        // verify that the body is correct.
        // will do this for later puposes.
        if(!bodyJson) return res.status(404).send({ message: 'Please provide body' });
        // ----------------------------
        if ( !resumeId ) return res.status(404).send({ message: "id is not defined" });


        const resume = await Resume.findOne({
            where: {
                id: resumeId
            }
        });

        if(!resume) return res.status(404).send({message: "Invalid Id"});

        const rules = resume.rules;

        try{
            const isValid = verifyRules(bodyJson, rules);

            if(isValid){
                ejs.renderFile(`${appRoot}/pdf/resumes/${resumeId}/layout.ejs`, bodyJson, {}, function(err, result){
                    if(err) throw err;
                    // res.setHeader('Content-Type', 'text/html');
                    return res.send(result);
                });
            } else {
                return res.send({ message: "Invalid Body" });
            }
        }catch(e){
            console.error(e);
            return res.status(500).send({
                message: "Internal Server Error"
            });
        }
    });

    /**
     * saves the html result into the database.
     */
    router.post('/save-resume-html', authorize, async (req, res) => {
        const {id: resumeId} = req.query;
        //@ts-ignore
        const {id: userId} = req.user;
        if(!resumeId) res.status(404).send({message: 'id is not defined'});

        const body = req.body;

        const { UserResume, Resume } = db;

        let jpgPath = '';
        let renderPath = '';

        try {

            const resume = await Resume.findOne({
                where: {
                    id: resumeId
                }
            });

    
            if(!resume) return res.status(404).send({message: "Invalid Id"});

            const rules = resume.rules;

            if(!verifyRules(body, rules)) return res.send( { message: "Invalid body" } );

            const userResume = UserResume.build({
                userId: userId,
                resumeId: resumeId,
                BodyJson: body
            });

            await userResume.save();

            const userResumeId = userResume.id;


            // generate a html result from JSON
            const htmlResult = await new Promise((resolve, reject) => {
                ejs.renderFile(`${appRoot}/pdf/resumes/${resumeId}/layout.ejs`, body, {}, async function(err, htmlResult){
                    if(err) reject(err);
                    // res.send(htmlResult);
                    resolve(htmlResult);
                });
            });

            // create directory/file and store the html result.
            await makeDir(`${appRoot}/pdf/users/${userId}/html`, { recursive: true });
            const htmlFileName =  `${userResumeId}-${resumeId}-${Date.now()}.html`;
            const renderPathHTML  = `${appRoot}/pdf/users/${userId}/html/${htmlFileName}`;
            await writeFile(renderPathHTML, htmlResult);

            jpgPath = htmlFileName?.split('.')[0] + '.jpg';
            renderPath = renderPathHTML;

            await userResume.update({
                htmlFile: htmlFileName,
                imagePath: jpgPath
            });

            res.status(200).send({
                id: userResumeId,
                resumeId: resumeId
            });
        }catch(err) {
            return res.status(500).send({ message: err.message });
        }

        resizeImage(renderPath, jpgPath, userId);
    }); 

    /**
     * updates the existing html result into database.
     */
    router.put('/update-resume-html', authorize, async (req, res) => {
        const { id: userResumeId } = req.query;
        //@ts-ignore
        const { id: userId } = req.user;
        const body = req.body;

        let jpgPath = '';
        let renderPath = '';

        try{
            const {UserResume, Resume} = db;

            const userResume = await UserResume.findOne({
                where: {
                    id: userResumeId
                },
                include: [
                    {
                        model: Resume
                    }
                ],
            });



            const { htmlFile, resumeId } = userResume;

            const { rules } = userResume.Resume;

            if (!verifyRules(body, rules)) return res.status(500).send('Invalid Body');

            userResume.BodyJson = body;

            userResume.save();

            // await UserResume.update(userResume, {
            //     where: {
            //         id: userResumeId
            //     }
            // });


            const htmlResult = await new Promise((resolve, reject) => {
                ejs.renderFile(`${appRoot}/pdf/resumes/${resumeId}/layout.ejs`, body, {}, async function(err, htmlResult){
                    if(err) reject(err);

                    resolve(htmlResult);
                });
            });

            // create directory/file and store the html result.
            await makeDir(`${appRoot}/pdf/users/${userId}/html`, { recursive: true });
            const htmlFileName =  htmlFile;
            const renderPathHTML  = `${appRoot}/pdf/users/${userId}/html/${htmlFileName}`;
            await writeFile(renderPathHTML, htmlResult);

            jpgPath = htmlFileName?.split('.')[0] + '.jpg';
            renderPath = renderPathHTML;

            res.status(200).send();

        } catch(err){
            return res.status(500).send({ message: err.message });
        }

        resizeImage(renderPath, jpgPath, userId);
    });

    /**
     * saves the pdf format of the html that already exist.
     */
    router.post('/save-resume-pdf', authorize, async (req, res) => {
        const { id: userResumeId } = req.query;
        //@ts-ignore
        const { id: userId } = req.user;
        const { Resume, UserResume } = db;

        if(!userResumeId) res.status(404).send(
            {
                message: 'id is not available'
            }
        );

        const userResume = await UserResume.findOne({
            where: {
                id: userResumeId
            }
        });

        const { resumeId } = userResume;

        const htmlFileName = userResume.htmlFile;
        const htmlFilePathDir = `${appRoot}/pdf/users/${userId}/html`;

        // create a pdf file from html and store it in directory.
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security'
            ],
        });
        const page = await browser.newPage();

        await page.goto(`${htmlFilePathDir}/${htmlFileName}`,  {
            waitUntil: 'networkidle0'
        });
    
        await makeDir(`${appRoot}/pdf/users/${userId}/pdf`, { recursive: true });
        const pdfFileName = `${userResumeId}-${resumeId}-${Date.now()}.pdf`;
        const renderPathPdf = `${appRoot}/pdf/users/${userId}/pdf/${pdfFileName}`;
        await page.pdf({ path: `${renderPathPdf}`, format: 'a4', printBackground: true,  preferCSSPageSize: true,
            margin: {
                left: '0',
                right: '0',
                top: '0',
                bottom: '0'
            } 
        })
        await browser.close();


        await userResume.update({
            pdfFile: pdfFileName
        });

        res.status(200).send({
            pdfFile: pdfFileName
        });
    });

    /**
     * donwload the pdf from ther server.
     */
    router.get('/get-pdf', authorize, async (req, res) => {
        const { id: userResumeId } = req.query;
        //@ts-ignore
        const { id: userId } = req.user;
        if ( !userResumeId ) return res.status(404).send({message: "id is not defined"});

        const { UserResume } = db;

        try{
            const userResume = await UserResume.findOne({
                where: {
                    id: userResumeId,
                    userId: userId
                }
            })
    
            if(!userResume) return res.status(500).send( {message: "invalid id"} );
    
            const fileName = userResume.pdfFile;
    
            res.setHeader('Content-Type', 'application/pdf');
            res.sendFile(`${appRoot}/pdf/users/${userId}/pdf/${fileName}`);
        }catch(err){
            return res.status(500).send({ message: err.message, name: err.name });
        }        
    });


    router.get('/get-html', authorize, async (req, res) => {
        const { id: userResumeId } = req.query;
        //@ts-ignore
        const { id: userId } = req.user;

        const {UserResume} = db;
        
        const userResume = await UserResume.findOne({
            where: {
                id: userResumeId
            },
            attributes: ['htmlFile']
        });

        const {htmlFile} = userResume; 

        res.sendFile(`${appRoot}/pdf/users/${userId}/html/${htmlFile}`);

    });

    router.delete('/delete-userresume', authorize, async (req, res) => {
        const { id: userResumeId } = req.query;
        const { UserResume } = db;
        try{
            await UserResume.destroy({
                where: {
                    id: userResumeId
                }
            });

            res.send();
        }catch(e){
            res.status(500).send();
        }
    });

    // this code has been broken into two other api's (save-resume-html and save-resume-pdf)
    // dont use this part of the code just save it for later.
    router.post('/save-resume', authorize , async (req, res) => {
        const { id: resumeId } = req.query;
        //@ts-ignore
        const { id: userId } = req.user;

        if(!resumeId) res.status(404).send( { message: "id is not defined" } );

        const body = req.body;

        const { UserResume, Resume } = db;        

        // lets assume that i have stored the pdf file right here.
        try{
            // store the data in the database.
            const userResume = UserResume.build({
                userId: userId,
                resumeId: resumeId,
                BodyJson: body,
                // htmlFile: htmlFileName,
                // pdfFile: pdfFileName
            });
            await userResume.save();


            // generate a html result from JSON
            const htmlResult = await new Promise((resolve, reject) => {
                ejs.renderFile(`${appRoot}/pdf/resumes/${resumeId}/layout.ejs`, body, {}, async function(err, htmlResult){
                    if(err) reject(err);

                    resolve(htmlResult);
                });
            });

            // create directory/file and store the html result.
            await makeDir(`${appRoot}/pdf/users/${userId}/html`, { recursive: true });
            const htmlFileName =  `${resumeId}-${Date.now()}.html`;
            const renderPathHTML  = `${appRoot}/pdf/users/${userId}/html/${htmlFileName}`;
            await writeFile(renderPathHTML, htmlResult);


            // create a pdf file from html and store it in directory.
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security'
                ],
            });
            const page = await browser.newPage();
    
            await page.goto(`${renderPathHTML}`,  {
                waitUntil: 'networkidle0'
            });
        
            await makeDir(`${appRoot}/pdf/users/${userId}/pdf`, { recursive: true });
            const pdfFileName = `${resumeId}-${Date.now()}.pdf`;
            const renderPathPdf = `${appRoot}/pdf/users/${userId}/pdf/${pdfFileName}`;
            await page.pdf({ path: `${renderPathPdf}`, format: 'a4', printBackground: true,  preferCSSPageSize: true,
                margin: {
                    left: '0',
                    right: '0',
                    top: '0',
                    bottom: '0'
                } 
            })
            await browser.close();

            // update the path of html and pdf
            await userResume.update({
                htmlFile: htmlFileName,
                pdfFile: pdfFileName
            });  

            return res.status(200).send({
                filepath: pdfFileName
            });
        }catch(err) {
            const response = res.status(500);
            if(err.name === "SequelizeUniqueConstraintError"){
                return response.send({ message: err.message, Errros: err.errors?.map(x => x.message) })
            }  
            
            if (err.name === "SequelizeDatabaseError") {
                return response.send({ message: err.message, name: err?.name  })
            }
            
            return response.send({ name: err.name, message: err.message });            
        }
    });

    router.put('/update-resume', authorize, async (req, res) => {
        // const { id: resumeId } = req.query;
        const { id: userResumeId } = req.query;
        //@ts-ignore
        const { id: userId } = req.user;

        if(!userResumeId) res.status(404).send( { message: "id is not defined" } );

        const body = req.body;

        const { UserResume, Resume } = db;

        const userResume = await UserResume.findOne({
            where: {
                id: userResumeId
            }
        });
        if(!userResume) return res.status(404).send({ message: "Invalid id" })
        userResume.BodyJson = body;
        await userResume.save();

        const {resumeId, htmlFile, pdfFile} = userResume;

        const htmlResult = await new Promise((resolve, reject) => {
            ejs.renderFile(`${appRoot}/pdf/resumes/${resumeId}/layout.ejs`, body, {}, async function(err, htmlResult){
                if(err) reject(err);

                resolve(htmlResult);
            });
        });

        const renderPathHTML = `${appRoot}/pdf/users/${userId}/html/${htmlFile}`;
        await writeFile(renderPathHTML, htmlResult);

        // create a pdf file from html and store it in directory.
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security'
            ],
        });
        const page = await browser.newPage();

        await page.goto(renderPathHTML,  {
            waitUntil: 'networkidle0'
        });

        const renderPathPdf = `${appRoot}/pdf/users/${userId}/pdf/${pdfFile}`;
        await page.pdf({ path: renderPathPdf, format: 'a4', printBackground: true,  preferCSSPageSize: true,
            margin: {
                left: '0',
                right: '0',
                top: '0',
                bottom: '0'
            } 
        })
        await browser.close();
    });

    router.get('/get-userresume-image', authorize, async (req, res) => {
        //@ts-ignore
        const { id: userId } = req.user;
        const { id: imagePath } = req.query;
        res.sendFile(`${appRoot}/pdf/users/${userId}/image/${imagePath}`);
    });

    return router;
};

async function resizeImage(renderPathHTML, imgPath, userId){
     // extra code
     const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security'
        ],
     })
     const page = await browser.newPage();

     await page.setViewport({width: 793, height: 1122});
     await page.goto(renderPathHTML,  {
         waitUntil: 'networkidle0'
     });
     const screenshot =  await page.screenshot({
         fullPage: true
     });
     await browser.close();

     await makeDir(`${appRoot}/pdf/users/${userId}/image`, { recursive: true });

     // @ts-ignore
     sharp(screenshot)
     .resize(400, 566)
     .toFile(`${appRoot}/pdf/users/${userId}/image/${imgPath}`)
}

module.exports = ResumeController;