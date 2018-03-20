const fs = require('fs');

module.exports = {
    saveLog: () => {
        let message = {
            message: "something"
        };

        let jsonString = JSON.stringify(message);

        fs.appendFile("./log/log.json", jsonString, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The log was saved!");
            }
        })
    }
}