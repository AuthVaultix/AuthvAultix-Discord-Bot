const fs = require("fs");
const path = require("path");

function loadEnv() {
    // __dirname is D:\Bot\bot\utils
    const localEnv = path.resolve(__dirname, "..", ".env");
    const parentEnv = path.resolve(__dirname, "..", "..", ".env");

    if (fs.existsSync(localEnv)) {
        require("dotenv").config({ path: localEnv });
    } else if (fs.existsSync(parentEnv)) {
        require("dotenv").config({ path: parentEnv });
    } else {
        require("dotenv").config();
    }
}

loadEnv();
