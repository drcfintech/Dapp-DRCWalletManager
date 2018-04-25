var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations, {gas: '5725218', gasPrice: '4000000000'}).then(
    function(instance) {
      console.log(instance);
    }
  );
};
