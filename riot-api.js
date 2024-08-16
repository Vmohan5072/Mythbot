import 'dotenv/config';
const request = require('request');
const config = require('.env');
const apiKey = config.RIOT_KEY; //Fetches riot API key from .env

const getData = (body, statusCode, callback) => {
    const data = JSON.parse(body);

    if(!callback) return; //if no response, exit function

    if (data.status) {
        callback(data);
    }
}

const getPuuid = (userName, tagLine) => {

    
}
