var Migrations = artifacts.require("Migrations");

const Web3 = require("web3");
const Promise = require("bluebird");
const walletConfig = require("../config/walletConfig.json");
const contractConfig = require('../config/compileContract.json');


module.exports = function (deployer) {
  deployer.deploy(Migrations, {
    gas: contractConfig.contracts[0].requiredGasLimit, //'6700000',
    gasPrice: contractConfig.gasPrice
  });
};