require('@google-cloud/debug-agent').start();
var functions = require('firebase-functions');
exports.imgOptimizer = require("./fireImgOptimizer")();

// // Start writing Firebase Functions
// // https://firebase.google.com/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// })
