const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const moment = require('moment');
let ioSocket = null;

module.exports = {
  initCon(io) {
    ioSocket = io;
    io.on('connection', function (socket) {
      console.log('connected')
    })
  },
  uploadSong(req, res, next) {
    req.setTimeout(0)
    const {url, title, id} = req.body;
    console.log(title);
    console.log('Log :: preview ->', url);
    const args = {
      format: 'mp3',
      bitrate: 128,
      seek: 0,
      duration: null
    }

    const audioOutput = path.resolve(__dirname, `audio/${title}.mp3`);
    ytdl.getInfo(url, (err, info) => {
      if (err) throw err;
      ffmpeg()
        .input(ytdl(url, {filter: 'audioonly'}))
        .format(args.format)
        .on('error', err => {
          fs.unlink(audioOutput, err => {
            if (err) console.error(err);
            else console.log('File deleted =>', audioOutput);
          });
          res.json({message: 'Failed to format the video'})
        })
        .on('progress', progress => {
          const currentTime = moment.duration(progress.timemark).asSeconds();
          const percent = (currentTime / info.length_seconds) * 100
          console.log(`Status => ${percent}%`)
          ioSocket.emit('downloading', {id, status: percent})
        })
        .on('end', () => {
          ioSocket.emit('downloading', {id, status: 100})
          res.download(audioOutput, (err) => {
            if (err) {
              console.log(err);
            }
            setTimeout(() => {
              fs.unlink(audioOutput, err => {
                if (err) console.error(err);
                else console.log('File deleted =>', audioOutput);
              });
            }, 1000);
          })
        })
        .save(audioOutput)
    })
  }
}