const fs = require('fs')
const utils = require('util')
const puppeteer = require('puppeteer')
const cors = require('cors');
const readFile = utils.promisify(fs.readFile);
const writeFile = utils.promisify(fs.writeFile);
const makeDir = utils.promisify(fs.mkdir);
const ejs = require('ejs');


const express = require('express');
const apiRouter = require('./src/controller');



const app = express();




(async () => {
    const db = require('./src/database/models');

    try{
        await db.sequelize.authenticate();

        app.use(express.json());
        app.use(cors());
        app.use(express.static('./node_modules/@fortawesome/fontawesome-free/css/all.css'));

        app.use('/api/v1', apiRouter());

        app.listen(3000, function() { console.log('the app is running'); });

    }catch(e){
        throw new Error(e);
    }

    return;
})();


app.post('/load-view', (req, res) => {
    const { path, filename } = req.body;
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(`${__dirname}/pdf/resumes/${path}/${filename}`);
});

// app.get('/resume-body', (req, res) => {
//     res.setHeader('Content-Type', 'text/html');
//     res.sendFile(path.join(`${__dirname}/pdf/resumes/ubuntu-layout/main.html`));
// });

// app.get('/', async (req, res) => {

//     // const invoicePath = path.resolve("./pdf/resume.html");
//     // const html = await readFile(invoicePath, 'utf8');
//     // const template = hb.compile(html, { strict: true });

//     // const result = template({});

//     // console.log(result);


//     const browser = await puppeteer.launch({
//         headless: true
//     });
//     const page = await browser.newPage();

//     // await page.setContent(result)

//     await page.goto(__dirname + '/pdf/resume.html',  {
//         waitUntil: 'networkidle0'
//     });
    
//     await page.pdf({ path: 'sample.pdf', format: 'a4', printBackground: true,  preferCSSPageSize: true,
//         margin: {
//             left: '0',
//             right: '0',
//             top: '0',
//             bottom: '0'
//         } 
//     })
    
//     await browser.close();

//     res.setHeader('Content-Type', 'text/html');
//     res.sendFile(__dirname + '/pdf/resume.html');
// });


// app.post('/test', (req, res) => {

//     const data = req.body;
//     ejs.renderFile(`${__dirname}/pdf/resumes/ubuntu-layout/layout.ejs`, data, {}, function(err, result){
//         if(err) throw err;
//         return res.send(result);
//     });
// });

// app.post('/get-pdf', async (req, res) => {
//     const data = req.body;
//     ejs.renderFile(`${__dirname}/pdf/resumes/ubuntu-layout/layout.ejs`, data, {}, async function(err, result){
//         if(err) throw err;


//         const date = Date.now();

//         await makeDir(`${__dirname}/pdf/123456`, { recursive: true })
//         await writeFile(`${__dirname}/pdf/123456/${date}-pdf-file.html`, result);

//         const browser = await puppeteer.launch({
//             headless: true
//         });
//         const page = await browser.newPage();
    
//         // await page.setContent(result)
    

//         await page.goto(`${__dirname}/pdf/123456/${date}-pdf-file.html`,  {
//             waitUntil: 'networkidle0'
//         });
        
//         await page.pdf({ path: `${__dirname}/pdf/123456/${date}-pdf-file.pdf`, format: 'a4', printBackground: true,  preferCSSPageSize: true,
//             margin: {
//                 left: '0',
//                 right: '0',
//                 top: '0',
//                 bottom: '0'
//             } 
//         })
        
//         await browser.close();

//         return res.send({fileName: 'pdf-file.pdf'});
//     });
// });


// app.get('/asdf', (req, res) => {
//     res.setHeader('Content-Type', 'text/html');
//     res.sendFile(`${__dirname}/fontend.html`);
// });
