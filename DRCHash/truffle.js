require('babel-register');
const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require('web3');
const walletConfig = require('./config/walletConfig.json');


var infura_apikey = "9rWQxDtU4uAbAWdFFSAR";

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*' // Match any network id
    },
    ropsten: {
      provider: new HDWalletProvider(walletConfig.mnemonic, "https://ropsten.infura.io/" + infura_apikey),
      network_id: 3
    },
    rinkeby: {
      provider: new HDWalletProvider(walletConfig.mnemonic, "https://rinkeby.infura.io/" + infura_apikey, 24),
      network_id: 4
    }
  }
}