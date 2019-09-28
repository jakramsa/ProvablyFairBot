#!/usr/bin/env node
const { pastebinConfig } = require('../config.json');
const https = require("https");

module.exports = {
    submitPaste(data, message){
        if(pastebinConfig.DevApiKey && pastebinConfig.DevApiKey.length >= 1){
            const body = `api_option=paste&api_dev_key=${pastebinConfig.DevApiKey}&api_paste_private=1&api_paste_name=${message.guild.id}&api_paste_expire_date=1H&api_paste_format=json&api_paste_code=${encodeURIComponent(JSON.stringify(data))}`;
            const options = {
                hostname: 'pastebin.com',
                path: 'api/api_post.php',
                method: 'POST',
                headers: {
                    'Host': 'pastebin.com',
                    'Referer': 'https://pastebin.com/',
                    'Content-Length': body.length
                }
            };
            const req = https.request(options, (res) => {
                //console.log('statusCode:', res.statusCode);
                //console.log('headers:', res.headers);
                let responseContent = '';
                res.on('data', (d) => {
                    //console.log(d);
                    responseContent += d;
                });
                res.on('end', () => {
                    //console.log('No more data in response.');
                    //if(res.headers.location.match()){ return error; }
                    message.author.send(responseContent).then(m => message.react('\u{1F4EC}').catch(console.error));
                });
            });
            req.on('error', (e) => {
                console.error(`problem with request: ${e.message}`);
            });
            req.write(body);
            req.end();
        } else if(pastebinConfig.submitWithoutKey){
        const postUrl = "https://pastebin.com/post.php";
        const body = `-----------------------------121139421598276892647092056
Content-Disposition: form-data; name="csrf_token_post"

MTU2NTc0ODA0M0cwS2xjdENQeUJtSTR2b09NVDltbzRXdUcwYWw4cpe0
-----------------------------121139421598276892647092056
Content-Disposition: form-data; name="submit_hidden"

submit_hidden
-----------------------------121139421598276892647092056
Content-Disposition: form-data; name="paste_code"

${JSON.stringify(data)}
-----------------------------121139421598276892647092056
Content-Disposition: form-data; name="paste_format"

255
-----------------------------121139421598276892647092056
Content-Disposition: form-data; name="paste_expire_date"

1H
-----------------------------121139421598276892647092056
Content-Disposition: form-data; name="paste_private"

1
-----------------------------121139421598276892647092056
Content-Disposition: form-data; name="paste_name"

${message.guild.id}
-----------------------------121139421598276892647092056--`;
        const options = {
            hostname: 'pastebin.com',
            path: '/post.php',
            method: 'POST',
            headers: {
                'Host': 'pastebin.com',
                'Referer': 'https://pastebin.com/',
                'Content-Type': 'multipart/form-data; boundary=---------------------------121139421598276892647092056',
                'Content-Length': body.length
            }
        };
        const req = https.request(options, (res) => {
            //console.log('statusCode:', res.statusCode);
            //console.log('headers:', res.headers);

            res.on('data', (d) => {
                //console.log(d);
            });
            res.on('end', () => {
                //console.log('No more data in response.');
                //if(res.headers.location.match()){ return error; }
                message.author.send("http://pastebin.com"+res.headers.location).then(m => message.react('\u{1F4EC}').catch(console.error));
            });
        });
        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
        });
        req.write(body);
        req.end();
        } else {
            message.channel.send("No PasteBin.com developer API key was provided in the config.");
        }
    },
};