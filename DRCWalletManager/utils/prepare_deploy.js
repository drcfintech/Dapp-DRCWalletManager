const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const Promise = require('bluebird');
const walletConfig = require("../config/walletConfig.json");
// console.log(walletConfig.infuraAPIkey);

const contractConfig = require('../config/compileContract.json');
// let contractConfig = JSON.parse(fs.readFileSync(contractConfigFile));
console.log(contractConfig);
const gasPricePromote = {
    GT_30: 1.25,
    GT_20: 1.2,
    GT_10: 1.15,
    GT_3: 1.12,
    DEFAULT: 1.1
};
// var contractNum = contractConfig.number;

// let contractArray = contractConfig.contracts;
// for (var i = 0; i < contractNum; i++) {
//     var contractInstance = artifacts.require(contractConfig.contracts[i].name);
//     contractArray.push(contractInstance);
// }

var web3 = new Web3(
    new Web3.providers.HttpProvider(
        "https://rinkeby.infura.io/" + walletConfig.infuraAPIkey
    )
);

// const getGasPrice = () => {
//     return new Promise((resolve, reject) => {
//         web3.eth.getGasPrice((error, result) => {
//             if (error) reject(error);

//             var gasPrice = web3.utils.fromWei(result, "gwei");
//             console.log("gasPrice  ", gasPrice + "gwei");
//             if (gasPrice >= 3) gasPrice *= 1.25;
//             else if (gasPrice >= 2) gasPrice *= 1.5;
//             else gasPrice *= 2;

//             resolve(gasPrice);
//         });
//     }).catch(err => {
//         console.log("catch error when getGasPrice");
//         return new Promise.reject(err);
//     });
// };

const getGasPrice = () => {
    return new Promise((resolve, reject) => {
            const handle = setInterval(() => {
                web3.eth.getGasPrice((error, result) => {
                    if (error) {
                        clearInterval(handle);
                        reject(error);
                    }
                    //resolve(web3.utils.toHex(result));
                    if (result) {
                        clearInterval(handle);

                        let gasPrice = web3.utils.fromWei(result, "gwei");
                        console.log('gasPrice  ', gasPrice + 'gwei');
                        if (gasPrice >= 30) gasPrice *= gasPricePromote.GT_30;
                        else if (gasPrice >= 20) gasPrice *= gasPricePromote.GT_20;
                        else if (gasPrice >= 10) gasPrice *= gasPricePromote.GT_10;
                        else if (gasPrice >= 3) gasPrice *= gasPricePromote.GT_3;
                        else gasPrice *= gasPricePromote.DEFAULT;

                        // resolve(web3.utils.toHex(Math.round(result)));
                        resolve(gasPrice);
                    }
                });
            }, 5000);
        })
        .catch(err => {
            console.log("catch error when getGasPrice");
            return new Promise.reject(err);
        });
};


// 获取estimated gasLimit
const getGasLimit = callObject => {
    return new Promise((resolve, reject) => {
        const handle = setInterval(() => {
            web3.eth.estimateGas(callObject, (error, result) => {
                if (error /*&& !error.message.includes('gas required exceeds allowance')*/ ) {
                    clearInterval(handle);
                    reject(error);
                }
                //resolve(web3.utils.toHex(result));
                if (result) {
                    clearInterval(handle);
                    console.log("estimated gasLimit  ", result);
                    var finalResult = Math.round(result * 1.1);
                    if (finalResult > 6700000) finalResult = 6700000;
                    resolve(finalResult);
                }
            });
        }, 5000);
    }).catch(err => {
        console.log("catch error when getGasLimit");
        return new Promise.reject(err);
    });
};

const processContract = async function (contract) {
    // var realPrice;
    // var realGasLimit;
    console.log(contract.name);
    var contractPath = '../build/contracts/' + contract.name + '.json';
    var contractInstance = require(contractPath);
    let callObject = {
        data: contractInstance.bytecode
    };
    var realPrice = await getGasPrice();
    console.log("using gasPrice: ", realPrice + "gwei");
    var realGasLimit = await getGasLimit(callObject);
    console.log("using gasLimit: ", realGasLimit);

    contractConfig.gasPrice = web3.utils.toWei(realPrice.toString(), "gwei");
    contract.requiredGasLimit = realGasLimit;
};

console.log(contractConfig.contracts);

let promises = contractConfig.contracts.map((contract) => {
    return processContract(contract);
});

Promise.all(promises)
    .then(values => {
        console.log('current contract config content is ', contractConfig);
        let contractConfigFile = path.resolve(__dirname, '../config/compileContract.json');
        fs.writeFileSync(contractConfigFile, JSON.stringify(contractConfig));
    })
    .catch(e => {
        if (e) {
            console.log("evm error", e);
            return;
        }
    });



// let deployContract = (contract, deployer) => {
//     var realPrice;
//     var realGasLimit;
//     let callObject = {
//         data: contract.bytecode
//     };
//     Promise.all([getGasPrice(), getGasLimit(callObject)])
//         .then(values => {
//             realPrice = values[0];
//             console.log("using gasPrice: ", realPrice + "gwei");
//             realGasLimit = values[1];
//             console.log("using gasLimit: ", realGasLimit);

//             deployer
//                 .deploy(contract, {
//                     gas: realGasLimit, //'6700000',
//                     gasPrice: web3.utils.toWei(realPrice.toString(), "gwei")
//                 });
//             // .then(instance => {
//             //   console.log(instance);
//             // });
//         })
//         .catch(e => {
//             if (e) {
//                 console.log("evm error", e);
//                 return;
//             }
//         });
// };

// function sleep(time) {
//     return new Promise((resolve) => setTimeout(resolve, time));
// }