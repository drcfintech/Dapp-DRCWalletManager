var HashDataCon = artifacts.require("./HashDataCon.sol");

contract('HashDataCon', function (accounts) {

  it("insert test", function () {
    var meta;
    return HashDataCon.deployed().then(function (instance) {
      meta = instance;
      return meta.insertHash("123456", {
        from: accounts[0]
      });
    }).then(function (object) {
      return meta.selectHash.call("123456");
    }).then(function (object) {
      assert.equal(true, object[0], "select error");
      assert.equal(accounts[0], object[1], "insert error,saver not same");
    });
  });

  it("update test", function () {
    var meta;
    return HashDataCon.deployed().then(function (instance) {
      meta = instance;
      return meta.insertHash("1234567", {
        from: accounts[0]
      });
    }).then(function (object) {
      console.log(object.receipt.gasUsed);
      
      return meta.updateHash("1234567", {
        from: accounts[0]
      });
    }).then(function (object) {
      return meta.selectHash.call("1234567");
    }).then(function (object) {
      assert.equal(accounts[0], object[1], "update error,saver not same");
    });
  });

  it("delete test", function () {
    var meta;
    return HashDataCon.deployed().then(function (instance) {
      meta = instance;
      return meta.insertHash("1234567", {
        from: accounts[0]
      });
    }).then(function (object) {
      return meta.deleteHash("1234567", {
        from: accounts[0]
      });
    }).then(function (object) {
      return meta.selectHash.call("1234567");
    }).then(function (object) {
      assert.equal(false, object[0], "delete error");
      assert.equal(object[1], "0x0000000000000000000000000000000000000000", "delete error,saver not clear");
      assert.equal(object[2], 0, "delete error,time not clear");
    });
  });
});