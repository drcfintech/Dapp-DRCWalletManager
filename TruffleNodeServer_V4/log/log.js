const fs = require('fs');

var saveLog = function () {
    let message = {
        message: "something"
    };

    let jsonString = JSON.stringify(message);

    fs.appendFile("./log/log.json", jsonString, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
        }
    })
};

module.exports = {
    log: saveLog
}