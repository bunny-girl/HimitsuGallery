const Koa = require('koa');
const app = new Koa();

const fs = require('fs');
const path = require('path');
const extractFrame = require('ffmpeg-extract-frame');
const extractGif = require('ffmpeg-generate-video-preview');

const serveFiles = path => {
    return fs.readFileSync(path);
};

let content;
const basePath = '/Users/edel.ma/Downloads/test/';
const imageExtArr = ['.jpg', '.jpeg', '.png'];
const videoExtArr = ['.mov', '.avi', '.mp4'];

const getFrame = async (videoPath, framePath) => await extractFrame({input: videoPath, output : framePath, offset : 1000 * 5});
const getGif = async (videoPath, framePath) => await extractGif({input: videoPath, output : framePath, gifski : { fps: 1, quality: 50, fast: false }, numFrames : 15});

const toBase64 = str => new Buffer(str).toString('base64');
const fromBase64 = str => new Buffer(str, 'base64').toString();

const batchProcess = async (inputList) => {
    let results = [];
    for (let result of inputList) {
        results.push(await result);
    }
    return results;
};

app.use(async (ctx, next) => {
    switch (ctx.path) {
        case '/':
            ctx.type = 'text/html';
            ctx.body = serveFiles('./index.html');
            break;
        case '/dir':
            let res = [];
            content = fs.readdirSync(basePath).filter(item => item.charAt(0) !== '.');
            let tasks = content.map(async item => {
                let obj = {
                    name : item,
                    content : ''
                };
                let name = !path.extname(item) ? fromBase64(item) : item;
                let ext = path.extname(name).toLowerCase();
                if(imageExtArr.find(_ext => ext === _ext)){
                    let temp = fs.readFileSync(basePath + item, 'base64');
                    obj.content = `data:image/${ext.replace('.', '')};base64,${temp}`
                }
                if(videoExtArr.find(_ext => ext === _ext)){
                    let tempPath = `${__dirname}/data/${toBase64(name)}`;
                    if(!fs.existsSync(tempPath)){
                        console.log('dealing with videos');
                        await getGif(basePath + item, tempPath + '.gif');
                        fs.renameSync(tempPath + '.gif', tempPath);
                        console.log('Videos completed');
                    }
                    let temp = fs.readFileSync(tempPath, 'base64');
                    obj.content = `data:image/png;base64,${temp}`
                }
                res.push(obj);
            });
            await batchProcess(tasks);
            ctx.type = 'application/json';
            ctx.body = res;
            await next();
            break;
        case '/convert':
            content.map(item => {
                if (path.extname(item)) {
                    let name = toBase64(item);
                    fs.renameSync(basePath + item, basePath + name)
                }
            });
            ctx.body = '';
            await next();
            break;
        case '/back':
            content.map(item => {
                if (!path.extname(item)) {
                    let name = fromBase64(item);
                    fs.renameSync(basePath + item, basePath + name)
                }
            });
            ctx.body = '';
            await next();
            break;
        default:
            await next();
    }
});

app.listen(2334);
console.log('システムを起動しました!');
