require('babel-register');
const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require('web3');
const walletConfig = require('./config/walletConfig.json');


var infura_apikey = "0wkI1EZkxq3GUs5b2vaK";

module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*' // Match any network id
    },
    ropsten: {
      provider: () => {
        return new HDWalletProvider(walletConfig.mnemonic,
          "https://ropsten.infura.io/" + infura_apikey);
      },
      network_id: 3
    },
    rinkeby: {
      provider: () => {
        return new HDWalletProvider(walletConfig.mnemonic,
          "https://rinkeby.infura.io/" + infura_apikey);
      },
      network_id: 4
    },
    mainnet: {
      provider: () => {
        return new HDWalletProvider(walletConfig.mnemonic,
          "https://mainnet.infura.io/" + infura_apikey);
      },
      network_id: 1
    }
  }
}