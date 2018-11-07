pragma solidity ^0.4.23;


import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';

/**
 * contract that can withdraw ether or tokens
 */
contract Withdrawable is Ownable {
    event ReceiveEther(address _from, uint256 _value);
    event WithdrawEther(address _to, uint256 _value);
    event WithdrawToken(address _token, address _to, uint256 _value);

    /**
	 * @dev recording receiving ether from msn.sender
	 */
    function () payable public {
        emit ReceiveEther(msg.sender, msg.value);
    }

    /**
	 * @dev withdraw,send ether to target
	 * @param _to is where the ether will be sent to
	 *        _amount is the number of the ether
	 */
    function withdraw(address _to, uint _amount) public onlyOwner returns (bool) {
        require(_to != address(0));
        _to.transfer(_amount);
        emit WithdrawEther(_to, _amount);

        return true;
    }

    /**
	 * @dev withdraw tokens, send tokens to target
     *
     * @param _token the token address that will be withdraw
	 * @param _to is where the tokens will be sent to
	 *        _value is the number of the token
	 */
    function withdrawToken(address _token, address _to, uint256 _value) public onlyOwner returns (bool) {
        require(_to != address(0));
        require(_token != address(0));

        ERC20 tk = ERC20(_token);
        tk.transfer(_to, _value);
        emit WithdrawToken(_token, _to, _value);

        return true;
    }

    /**
     * @dev receive approval from an ERC20 token contract, and then gain the tokens, 
     *      then take a record
     *
     * @param _from address The address which you want to send tokens from
     * @param _value uint256 the amounts of tokens to be sent
     * @param _token address the ERC20 token address
     * @param _extraData bytes the extra data for the record
     */
    // function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) public {
    //     require(_token != address(0));
    //     require(_from != address(0));
        
    //     ERC20 tk = ERC20(_token);
    //     require(tk.transferFrom(_from, this, _value));
        
    //     emit ReceiveDeposit(_from, _value, _token, _extraData);
    // }
}
