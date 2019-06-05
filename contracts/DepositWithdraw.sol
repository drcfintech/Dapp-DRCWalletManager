pragma solidity >=0.4.18 <0.7.0;


import 'openzeppelin-solidity/contracts/ownership/Claimable.sol';
import 'openzeppelin-solidity/contracts/lifecycle/TokenDestructible.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './OwnerContract.sol';
import './Withdrawable.sol';
import './DRCWalletMgrParamsInterface.sol';


/**
 * contract that can deposit and withdraw tokens
 */
contract DepositWithdraw is Claimable, Withdrawable, TokenDestructible {
    using SafeMath for uint256;

    /**
     * transaction record
     */
    struct TransferRecord {
        uint256 timeStamp;
        address account;
        uint256 value;
    }
    
    /**
     * accumulated transferring amount record
     */
    struct accumulatedRecord {
        uint256 mul;
        uint256 count;
        uint256 value;
    }

    TransferRecord[] deposRecs; // record all the deposit tx data
    TransferRecord[] withdrRecs; // record all the withdraw tx data

    accumulatedRecord dayWithdrawRec; // accumulated amount record for one day
    accumulatedRecord monthWithdrawRec; // accumulated amount record for one month

    address payable wallet; // the binded withdraw address

    event ReceiveDeposit(address _from, uint256 _value, address _token, bytes _extraData);
    
    /**
     * @dev constructor of the DepositWithdraw contract
     * @param _wallet the binded wallet address to this depositwithdraw contract
     */
    constructor(address payable _wallet) public {
        require(_wallet != address(0));
        wallet = _wallet;
    }

    /**
	 * @dev set the default wallet address
	 * @param _wallet the default wallet address binded to this deposit contract
	 */
    function setWithdrawWallet(address payable _wallet) onlyOwner public returns (bool) {
        require(_wallet != address(0));
        wallet = _wallet;

        return true;
    }

    /**
	 * @dev util function to change bytes data to bytes32 data
	 * @param _data the bytes data to be converted
	 */
    function bytesToBytes32(bytes memory _data) public pure returns (bytes32 result) {
        assembly {
            result := mload(add(_data, 32))
        }
    }

    /**
     * @dev receive approval from an ERC20 token contract, take a record
     *
     * @param _from address The address which you want to send tokens from
     * @param _value uint256 the amounts of tokens to be sent
     * @param _token address the ERC20 token address
     * @param _extraData bytes the extra data for the record
     */
    function receiveApproval(address _from, uint256 _value, address _token, bytes memory _extraData) onlyOwner public {
        require(_token != address(0));
        require(_from != address(0));
        
        ERC20 tk = ERC20(_token);
        require(tk.transferFrom(_from, address(uint160(address(this))), _value));
        bytes32 timestamp = bytesToBytes32(_extraData);
        deposRecs.push(TransferRecord(uint256(timestamp), _from, _value));
        emit ReceiveDeposit(_from, _value, _token, _extraData);
    }

    // function authorize(address _token, address _spender, uint256 _value) onlyOwner public returns (bool) {
    //     ERC20 tk = ERC20(_token);
    //     require(tk.approve(_spender, _value));

    //     return true;
    // }

    /**
     * @dev record withdraw into this contract
     *
     * @param _time the timstamp of the withdraw time
     * @param _to is where the tokens will be sent to
     * @param _value is the number of the token
     */
    function recordWithdraw(uint256 _time, address payable _to, uint256 _value) onlyOwner public {    
        withdrRecs.push(TransferRecord(_time, _to, _value));
    }

    /**
     * @dev check if withdraw amount is not valid
     *
     * @param _params the limitation parameters for withdraw
     * @param _value is the number of the token
     * @param _time the timstamp of the withdraw time
     */
    function checkWithdrawAmount(address _params, uint256 _value, uint256 _time) public returns (bool) {
        IDRCWalletMgrParams params = IDRCWalletMgrParams(_params);
        require(_value <= params.singleWithdrawMax());
        require(_value >= params.singleWithdrawMin());

        uint256 daysCount = _time.div(86400); // one day of seconds
        if (daysCount <= dayWithdrawRec.mul) {
            dayWithdrawRec.count = dayWithdrawRec.count.add(1);
            dayWithdrawRec.value = dayWithdrawRec.value.add(_value);
            require(dayWithdrawRec.count <= params.dayWithdrawCount());
            require(dayWithdrawRec.value <= params.dayWithdraw());
        } else {
            dayWithdrawRec.mul = daysCount;
            dayWithdrawRec.count = 1;
            dayWithdrawRec.value = _value;
        }
        
        uint256 monthsCount = _time.div(86400 * 30);
        if (monthsCount <= monthWithdrawRec.mul) {
            monthWithdrawRec.count = monthWithdrawRec.count.add(1);
            monthWithdrawRec.value = monthWithdrawRec.value.add(_value);
            require(monthWithdrawRec.value <= params.monthWithdraw());
        } else {            
            monthWithdrawRec.mul = monthsCount;
            monthWithdrawRec.count = 1;
            monthWithdrawRec.value = _value;
        }

        return true;
    }

    /**
	 * @dev withdraw tokens, send tokens to target
     *
     * @param _token the token address that will be withdraw
     * @param _params the limitation parameters for withdraw
     * @param _time the timstamp of the withdraw time
	 * @param _to is where the tokens will be sent to
	 *        _value is the number of the token
     *        _fee is the amount of the transferring costs
     *        _tokenReturn is the address that return back the tokens of the _fee
	 */
    function withdrawToken(address _token, address _params, uint256 _time, address payable _to, uint256 _value, uint256 _fee, address payable _tokenReturn) public onlyOwner returns (bool) {
        require(_to != address(0));
        require(_token != address(0));
        require(_value > _fee);
        // require(_tokenReturn != address(0));

        require(checkWithdrawAmount(_params, _value, _time));

        ERC20 tk = ERC20(_token);
        uint256 realAmount = _value.sub(_fee);
        require(tk.transfer(_to, realAmount));
        if (_tokenReturn != address(0) && _fee > 0) {
            require(tk.transfer(_tokenReturn, _fee));
        }

        recordWithdraw(_time, _to, realAmount);
        emit WithdrawToken(_token, _to, realAmount);

        return true;
    }

    /**
	 * @dev withdraw tokens, send tokens to target default wallet
     *
     * @param _token the token address that will be withdraw
     * @param _params the limitation parameters for withdraw
     * @param _time the timestamp occur the withdraw record
	 * @param _value is the number of the token
     *        _fee is the amount of the transferring costs
     *        —tokenReturn is the address that return back the tokens of the _fee
	 */
    function withdrawTokenToDefault(address _token, address _params, uint256 _time, uint256 _value, uint256 _fee, address payable _tokenReturn) public onlyOwner returns (bool) {
        return withdrawToken(_token, _params, _time, wallet, _value, _fee, _tokenReturn);
    }

    /**
	 * @dev get the Deposit records number
     *
     */
    function getDepositNum() public view returns (uint256) {
        return deposRecs.length;
    }

    /**
	 * @dev get the one of the Deposit records
     *
     * @param _ind the deposit record index
     */
    function getOneDepositRec(uint256 _ind) public view returns (uint256, address, uint256) {
        require(_ind < deposRecs.length);

        return (deposRecs[_ind].timeStamp, deposRecs[_ind].account, deposRecs[_ind].value);
    }

    /**
	 * @dev get the withdraw records number
     *
     */
    function getWithdrawNum() public view returns (uint256) {
        return withdrRecs.length;
    }
    
    /**
	 * @dev get the one of the withdraw records
     *
     * @param _ind the withdraw record index
     */
    function getOneWithdrawRec(uint256 _ind) public view returns (uint256, address, uint256) {
        require(_ind < withdrRecs.length);

        return (withdrRecs[_ind].timeStamp, withdrRecs[_ind].account, withdrRecs[_ind].value);
    }
}
