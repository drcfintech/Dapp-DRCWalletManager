pragma solidity ^0.4.18;

import "truffle/Assert.sol";
import "../contracts/HashDataCon.sol";

	contract TestHashDataCon {
		
	  function testInsertHash() public {
			HashDataCon hashcon = new HashDataCon();
			bool temp = hashcon.insertHash("e10adc3949ba59abbe56e057f20f883e");
			Assert.equal(temp, true, "hash not match");
	  }
	  
	  function testUpdateHash() public {
			HashDataCon hashcon = new HashDataCon();
			hashcon.insertHash("e10adc3949ba59abbe56e057f20f883e");
			bool temp = hashcon.updateHash("e10adc3949ba59abbe56e057f20f883e");
			Assert.equal(temp, true, "hash not match");
	  }
	  
	  function testSelectHash() public {
			HashDataCon hashcon = new HashDataCon();
			hashcon.insertHash("e10adc3949ba59abbe56e057f20f883e");
			var ( tempBool, , ) = hashcon.selectHash("e10adc3949ba59abbe56e057f20f883e");
			Assert.equal(tempBool, true, "hash not match");
	  }
	  
	  function testDeleteHash() public {
			HashDataCon hashcon = new HashDataCon();
			hashcon.insertHash("e10adc3949ba59abbe56e057f20f883e");
			bool temp = hashcon.deleteHash("e10adc3949ba59abbe56e057f20f883e");
			Assert.equal(temp, true, "hash not match");
	  }
	}