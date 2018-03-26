pragma solidity ^0.4.18;

library HashOperateLib {
    
    struct ExInfo{
        address saver;
        uint256 saveTime;
    }
    
    struct Info{
        mapping(string=>ExInfo) hashInfo;
    }
	
	/**
	 * @dev insertHash,insert method
	 * @param  _self is where the data will be saved
	 *         _hash is input value of hash
	 * @return bool,true is successful and false is failed
	 */
    function insertHash(Info storage _self, string _hash) internal returns (bool) {
        
        if (_self.hashInfo[_hash].saveTime > 0){
            return false;
        }else{
            _self.hashInfo[_hash].saver = msg.sender;
            _self.hashInfo[_hash].saveTime = now;
            return true;
        }
    }
    
	/**
	 * @dev deleteHash,delete method
	 * @param  _self is where the data will be saved
	 *         _hash is input value of hash
	 * @return bool,true is successful and false is failed
	 */
    function deleteHash(Info storage _self, string _hash) internal returns (bool) {
        
        if (_self.hashInfo[_hash].saveTime > 0){
            delete _self.hashInfo[_hash];
            return true;
        }else{
            return false;
        }  
    }
    
	/**
	 * @dev selectHash,select method
	 * @param  _self is where the data will be saved
	 *         _hash is input value of hash
	 * @return true/false,saver,save time
	 */
    function selectHash(Info storage _self, string _hash) internal view returns (bool,address,uint256) {
        if (_self.hashInfo[_hash].saveTime > 0){

            return (true,_self.hashInfo[_hash].saver,_self.hashInfo[_hash].saveTime);
        }else{
            return (false,address(0),0);
        }  
    }
}

contract OwnableCon {
    
    address public owner;
    
	/**
	 * @dev The Ownable contract has an owner address, 
	 *      and provides basic authorization control
	 */
    function OwnableCon() public {
        owner = msg.sender;
    }

	/**
	 * @dev Throws when called by other account than owner
	 */
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
	
	/**
	 * @dev Allows the owner to transfer control of the contract to a newOwner.
	 * @param newOwner The address to transfer ownership to.
	 */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0));
        owner = newOwner;
    }
}

contract HashDataCon is OwnableCon{
    
	//import the HashOperateLib for contract
    using HashOperateLib for HashOperateLib.Info;
    HashOperateLib.Info tempInfo;
    
    event LogInsertHash(address indexed _saver, string _hash, bool _bool);
    event LogDeleteHash(address indexed _saver, string _hash, bool _bool);

	/**
	 * @dev Constructor,not used just reserved
	 */
    function HashDataCon() public {
    }
	
	/**
	 * @dev insertHash,insert hash into contract
	 * @param _hash is input value of hash
	 * @return bool,true is successful and false is failed
	 */
    function insertHash(string _hash) public returns (bool) {
        bool temp = tempInfo.insertHash(_hash);
        LogInsertHash(msg.sender, _hash, temp);
        return temp;
    }
    
	/**
	 * @dev selectHash,select hash from contract
	 * @param _hash is input value of hash
	 * @return true/false,saver,save time
	 */
    function selectHash(string _hash) view public returns (bool,address,uint256) {
        return (tempInfo.selectHash(_hash));
    } 
    
	/**
	 * @dev deleteHash,delete hash into contract
	 * @param _hash is input value of hash
	 * @return bool,true is successful and false is failed
	 */
    function deleteHash(string _hash) onlyOwner public returns (bool) {
        bool temp = tempInfo.deleteHash(_hash);
        LogDeleteHash(msg.sender, _hash, temp);
        return temp;
    } 
    
	/**
	 * @dev kill,destroy the contract and send ether to _upgrater
	 * @param _upgrater is where the ether will be send
	 */
    function kill(address _upgrater) onlyOwner public {
        selfdestruct(_upgrater);
    }
	
	/**
	 * @dev withdraw,send ether to target
	 * @param _to is where the ether will be send
	 *        _amount is the number of the ether
	 */
    function withdraw(address _to, uint _amount) public onlyOwner {
        _to.transfer(_amount);
    }
	
	/**
	 * @dev fallback,if the contract will receive ether
	 */
    function() public payable {
    }
}