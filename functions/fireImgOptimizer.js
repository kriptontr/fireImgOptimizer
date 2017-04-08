(function () {
    'use strict';

    var functions = require('firebase-functions');
    var sharp = require('sharp');
    const gcs = require('@google-cloud/storage')();
    const LOCAL_TMP_FOLDER = '/tmp/';
    const mkdirp = require('mkdirp-promise');
    const fs = require('fs');
    const JPEG_EXTENSION = 'jpg';

    function imgOptimizer(params) {
        var config = {};
        (function init() {
            var options = {};
            if (params)
                options = params;
            config.targetPath = options.targetPath || '';
            config.sizes = options.sizes || {w: 300, h: 300};
            config.naming = {postfix: 'thumb', prefix: ''};
            config.imagePath = options.imagePath || 'images/';
        })();

        return functions.storage.object().onChange(function (event) {
            const object = event.data;
            const filePath = object.name;
            const filePathSplit = filePath.split('/');
            const fileName = filePathSplit.pop();
            const fileNameSplit = fileName.split('.');
            const fileExtension = fileNameSplit.pop();
            const baseFileName = fileNameSplit.join('.');
            const fileDir = filePathSplit.join('/') + (filePathSplit.length > 0 ? '/' : '');
            const JPEGFilePath = `${fileDir}${baseFileName}.${JPEG_EXTENSION}`;//
            const tempLocalDir = `${LOCAL_TMP_FOLDER}${object.generation}`;
            const tempLocalFile = `${tempLocalDir}${fileName}`;//
            const tempLocalJPEGFile = `${LOCAL_TMP_FOLDER}${JPEGFilePath}`;//

            const bucket = gcs.bucket(object.bucket);
            if (object.resourceState === 'not_exists') {
                console.log('This is a deletion event.');
                return;
            }
            if (fileDir.indexOf(config.imagePath) != 0) {
                console.log("file not in image folder", fileDir);
                return;
            }
            if (object.metadata)
                if (object.metadata.isThumb)
                    return;
            console.log(JSON.stringify(object));
            var thumbName = tempLocalFile + fileName + "thumb.jpg";
            return new Promise(function (resolve, reject) {
                download(tempLocalDir, filePath, tempLocalFile, bucket)
                    .then(function () {
                        resize(tempLocalFile, thumbName)
                            .then(function () {
                                upload(fileDir, fileName, thumbName, bucket)
                                    .then(function () {
                                        resolve();
                                    })
                            })
                    })
            });
        });

        function download(tempLocalDir, filePath, tempLocalFile, bucket) {
            return new Promise(function (resolve, reject) {
                mkdirp(tempLocalDir).then(function () {
                    bucket.file(filePath).download({
                        destination: tempLocalFile
                    })
                        .then(function () {
                            resolve();
                        })
                        .catch(function (err) {
                            reject(err);
                        })

                })
                    .catch(function (err) {
                        console.log("errMKDIRP", err)
                    })
            });
        }

        function resize(tempLocalFile, thumbName) {
            return new Promise(function (resolve, reject) {
                sharp(tempLocalFile).resize(200).toFile(thumbName)
                    .then(resolve)
                    .catch(function (err) {
                        console.log("resizeErr", err);
                        reject(err);
                    })
            })
        }

        function upload(fileDir, fileName, thumbName, bucket) {
            return new Promise(function (resolve, reject) {
                var stFileToUpload = bucket.file(config.naming.prefix + fileNameSplit + config.naming.postfix);
                fs.createReadStream(thumbName)
                    .pipe(stFileToUpload.createWriteStream({
                        validation: "crc32c",
                        resumable: false,
                        public: true,
                        gzip: true,
                        metadata: {
                            contentType: 'image/jpeg',
                            metadata: {
                                isThumb: 'true'
                            }
                        }
                    }))
                    .on('error', function (err) {
                        console.log("uploadERR", err);
                        reject(err);
                    })
                    .on('finish', function () {
                        console.log("uploadDone", fileName);
                        resolve();
                    });
            });
        }
    }
    module.exports = imgOptimizer;
})();