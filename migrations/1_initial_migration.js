var Migrations = artifacts.require("./Migrations.sol");

// module.exports = function(deployer) {
//   deployer.deploy(Migrations);
// };

const contractConfig = require('../config/compileContract.json');
// const defaultGasLimit = 6721975;


// console.log(contractConfig.contracts);
// var contractInstance1 = artifacts.require(contractConfig.contracts[1].name);
// var contractInstance2 = artifacts.require(contractConfig.contracts[2].name);

module.exports = function(deployer) {
  // deployContract(DRCWalletMgrCon, deployer);
  // sleep(300000);
  // deployContract(DRCWalletStorage, deployer);
  // deployer.then(() => {
  // contractConfig.contracts.map((contract, ind) => {
  // if (ind > 0) {
  console.log(contractConfig.contracts[0].name);
  deployer.deploy(Migrations, {
    gas: contractConfig.contracts[0].requiredGasLimit, //'6700000',
    gasPrice: contractConfig.gasPrice
  });
  // }
  // });
  // });
};