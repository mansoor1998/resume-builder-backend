const queryString = require('query-string');
const axios = require('axios').default;
require('dotenv').config()



function getGoogleAuthUrl(){
    const stringifiedParams = queryString.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ].join(' '), // space seperated string
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
    });
      
    const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${stringifiedParams}`;

    return googleLoginUrl
}


async function getUserToken(code){
    const { data } = await axios({
        url: `https://oauth2.googleapis.com/token`,
        method: 'post',
        data: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_SECRET_KEY,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
          code,
        },
    });

    return data;
}


async function getGoogleUserData(accessToken){
    // get user token (as jwt)
    // const {access_token} = await getUserToken(code);

    // get user data from {accesstoken}
    const { data: userData } = await axios({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        method: 'get',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
    });

    return userData;
}

module.exports = {
    getGoogleAuthUrl,
    getGoogleUserData
}