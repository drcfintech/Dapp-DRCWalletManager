var Migrations = artifacts.require("./Migrations.sol");
const Web3 = require('web3');
const Promise = require('bluebird');
const walletConfig = require('../config/walletConfig.json');

var web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/" + walletConfig.infuraAPIkey));

const getGasPrice = () => {
  return new Promise((resolve, reject) => {
    web3.eth.getGasPrice((error, result) => {
      if (error) reject(error);
      
      var gasPrice = web3.utils.fromWei(result, "gwei");
      console.log('gasPrice  ', gasPrice + 'gwei');
      if (gasPrice >= 3) gasPrice *= 1.25;
      else if (gasPrice >= 2) gasPrice *= 1.5;
      else gasPrice *= 2;

      resolve(gasPrice);
    });
  })
  .catch(err => {
    console.log("catch error when getGasPrice");
    return new Promise.reject(err);
  });
};

var realPrice;
Promise.all([getGasPrice()])
  .then(values => {
    realPrice = values[0];
    console.log("using gasPrice: ", realPrice + 'gwei');
  })
  .catch(e => {
    if (e) {
      console.log('evm error', e);
      return;
    }
  });

module.exports = function(deployer) {  
  deployer.deploy(Migrations, {gas: '4700000', gasPrice: web3.utils.fromWei(realPrice, 'gwei')}).then(
    function(instance) {
      console.log(instance);
    }
  );
};
