import 'dotenv/config';
const request = require('request');
const config = require('.env');
const apiKey = config.RIOT_KEY;

const getData = (body, statusCode, callback) => {
    const data = JSON.parse(body);

    
}