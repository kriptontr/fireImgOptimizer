# fireImgOptimizer
Dead simple image optimization module for firebase cloud functions

# Usage 
In index.js at functions folder, call & export module like that
```javascript
let sampleConfig = {
imagePath:"/images",
sizes:{w:300,h:500},
naming:{postfix:"300x500",prefix:"thumb"}
};
exports.imgOptimizer = require("./fireImgOptimizer")(sampleConfig);
```
