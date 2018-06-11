var DRCWalletMgrParamsCon = artifacts.require("./DRCWalletMgrParams.sol");
const Web3 = require('web3');
const Promise = require('bluebird');
const walletConfig = require('../config/walletConfig.json');
var web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/" + walletConfig.infuraAPIkey));

const getGasPrice = () => {
  return new Promise((resolve, reject) => {
    web3.eth.getGasPrice((error, result) => {
      if (error) reject(error);
      
      gasPrice = web3.utils.fromWei(result, "gwei");
      console.log('gasPrice  ', gasPrice + 'gwei');
      if (gasPrice >= 3) result *= 1.25;
      else if (gasPrice >= 2) result *= 1.5;
      else result *= 2;

      resolve(web3.utils.toHex(result));
    });
  })
  .catch(err => {
    console.log("catch error when getGasPrice");
    return new Promise.reject(err);
  });
};

module.exports = function(deployer) {
  Promise.all([getGasPrice()])
  .then(values => {
    var realPrice = values[0];
    console.log("using gasPrice: ", realPrice);
    deployer.deploy(DRCWalletMgrParamsCon, {gas: '4700000', gasPrice: realPrice}).then(
      function(instance) {
        console.log(instance);
      }
    );
  })
  .catch(e => {
    if (e) {
      console.log('evm error', e);
      return;
    }
  });
};