const Web3 = require("web3");
const Promise = require("bluebird");
const walletConfig = require("../config/walletConfig.json");
const contractConfig = require('../config/compileContract.json');

// console.log(contractConfig);

// var DRCWalletMgrCon = artifacts.require("DRCWalletManager");
// var DRCWalletStorage = artifacts.require("DRCWalletStorage");

// var web3 = new Web3(
//   new Web3.providers.HttpProvider(
//     "https://rinkeby.infura.io/" + walletConfig.infuraAPIkey
//   )
// );

// const getGasPrice = () => {
//   return new Promise((resolve, reject) => {
//     web3.eth.getGasPrice((error, result) => {
//       if (error) reject(error);

//       var gasPrice = web3.utils.fromWei(result, "gwei");
//       console.log("gasPrice  ", gasPrice + "gwei");
//       if (gasPrice >= 3) gasPrice *= 1.25;
//       else if (gasPrice >= 2) gasPrice *= 1.5;
//       else gasPrice *= 2;

//       resolve(gasPrice);
//     });
//   }).catch(err => {
//     console.log("catch error when getGasPrice");
//     return new Promise.reject(err);
//   });
// };

// // 获取estimated gasLimit
// const getGasLimit = callObject => {
//   return new Promise((resolve, reject) => {
//     const handle = setInterval(() => {
//       web3.eth.estimateGas(callObject, (error, result) => {
//         if (error /*&& !error.message.includes('gas required exceeds allowance')*/ ) {
//           clearInterval(handle);
//           reject(error);
//         }
//         //resolve(web3.utils.toHex(result));
//         if (result) {
//           clearInterval(handle);
//           console.log("estimated gasLimit  ", result);
//           var finalResult = Math.round(result * 1.1);
//           if (finalResult > 6700000) finalResult = 6700000;
//           resolve(finalResult);
//         }
//       });
//     }, 5000);
//   }).catch(err => {
//     console.log("catch error when getGasLimit");
//     return new Promise.reject(err);
//   });
// };

// let deployContract = (contract, deployer) => {
//   var realPrice;
//   var realGasLimit;
//   let callObject = {
//     data: contract.bytecode
//   };
//   Promise.all([getGasPrice(), getGasLimit(callObject)])
//     .then(values => {
//       realPrice = values[0];
//       console.log("using gasPrice: ", realPrice + "gwei");
//       realGasLimit = values[1];
//       console.log("using gasLimit: ", realGasLimit);

//       deployer
//         .deploy(contract, {
//           gas: realGasLimit, //'6700000',
//           gasPrice: web3.utils.toWei(realPrice.toString(), "gwei")
//         });
//       // .then(instance => {
//       //   console.log(instance);
//       // });
//     })
//     .catch(e => {
//       if (e) {
//         console.log("evm error", e);
//         return;
//       }
//     });
// };

// function sleep(time) {
//   return new Promise((resolve) => setTimeout(resolve, time));
// }

console.log(contractConfig.contracts);
// var contractInstance1 = artifacts.require(contractConfig.contracts[1].name);
// var contractInstance2 = artifacts.require(contractConfig.contracts[2].name);

module.exports = function (deployer) {
  // deployContract(DRCWalletMgrCon, deployer);
  // sleep(300000);
  // deployContract(DRCWalletStorage, deployer);
  // deployer.then(() => {
  contractConfig.contracts.map((contract, ind) => {
    if (ind > 0) {
      console.log(contract.name);
      var contractInstance = artifacts.require(contract.name);
      deployer.deploy(contractInstance, {
        gas: contract.requiredGasLimit, //'6700000',
        gasPrice: contractConfig.gasPrice
      });
    }
  });
  // });
  // console.log(contractConfig.contracts[0].requiredGasLimit);
  // console.log(contractConfig.contracts[1].requiredGasLimit);
  // console.log(contractConfig.gasPrice);
  // console.log(contractInstance1);
  // deployer.deploy(contractInstance1, {
  //   gas: contractConfig.contracts[1].requiredGasLimit, //'6700000',
  //   gasPrice: contractConfig.gasPrice
  // });
  // .then(
  //   function (instance) {
  //     console.log(instance);
  //   }
  // );
  // deployer.deploy(contractInstance2, {
  //   gas: contractConfig.contracts[2].requiredGasLimit, //'6700000',
  //   gasPrice: contractConfig.gasPrice
  // });
};