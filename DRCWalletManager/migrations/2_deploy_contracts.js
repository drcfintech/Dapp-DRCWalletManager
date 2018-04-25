var DRCWalletMgrCon = artifacts.require("./DRCWalletManager.sol");

module.exports = function(deployer) {
  deployer.deploy(DRCWalletMgrCon, {gas: '6975218', gasPrice: '3000000000'})
  .then(function(instance) {
    console.log(instance);
  });
};
