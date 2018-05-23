pragma solidity ^0.4.23;


import 'zeppelin-solidity/contracts/ownership/Claimable.sol';
import 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import 'zeppelin-solidity/contracts/lifecycle/Destructible.sol';
import 'zeppelin-solidity/contracts/lifecycle/TokenDestructible.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './DRCWalletMgrParams.sol';


contract OwnerContract is Claimable {
    Claimable public ownedContract;
    address internal origOwner;

    /**
     * @dev bind a contract as its owner
     *
     * @param _contract the contract address that will be binded by this Owner Contract
     */
    function bindContract(address _contract) onlyOwner public returns (bool) {
        require(_contract != address(0));
        ownedContract = Claimable(_contract);
        origOwner = ownedContract.owner();

        // take ownership of the owned contract
        ownedContract.claimOwnership();

        return true;
    }

    /**
     * @dev change the owner of the contract from this contract address to the original one. 
     *
     */
    function transferOwnershipBack() onlyOwner public {
        ownedContract.transferOwnership(origOwner);
        ownedContract = Claimable(address(0));
        origOwner = address(0);
    }

    /**
     * @dev change the owner of the contract from this contract address to another one. 
     *
     * @param _nextOwner the contract address that will be next Owner of the original Contract
     */
    function changeOwnershipto(address _nextOwner)  onlyOwner public {
        ownedContract.transferOwnership(_nextOwner);
        ownedContract = Claimable(address(0));
        origOwner = address(0);
    }
}

contract withdrawable is Ownable {
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

contract DepositWithdraw is Claimable, Pausable, withdrawable {
    using SafeMath for uint256;

    struct TransferRecord {
        uint256 timeStamp;
        address account;
        uint256 value;
    }

    struct accumulatedRecord {
        uint256 mul;
        uint256 count;
        uint256 value;
    }

    TransferRecord[] deposRecs;
    TransferRecord[] withdrRecs;

    accumulatedRecord dayWithdrawRec;
    accumulatedRecord monthWithdrawRec;

    address wallet; // the binded withdraw address

    event ReceiveDeposit(address _from, uint256 _value, address _token, bytes _extraData);
    
    constructor(address _wallet) public {
        require(_wallet != address(0));
        wallet = _wallet;
    }

    /**
	 * @dev set the default wallet address
	 * @param _wallet the default wallet address binded to this deposit contract
	 */
    function setWithdrawWallet(address _wallet) onlyOwner public returns (bool) {
        require(_wallet != address(0));
        wallet = _wallet;

        return true;
    }

    function bytesToBytes32(bytes _data) public pure returns (bytes32 result) {
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
    function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) onlyOwner whenNotPaused public {
        require(_token != address(0));
        require(_from != address(0));
        
        ERC20 tk = ERC20(_token);
        require(tk.transferFrom(_from, this, _value));
        bytes32 timestamp = bytesToBytes32(_extraData);
        deposRecs.push(TransferRecord(uint256(timestamp), _from, _value));
        emit ReceiveDeposit(_from, _value, _token, _extraData);
    }

    /**
	 * @dev withdraw tokens, send tokens to target
     *
     * @param _token the token address that will be withdraw
	 * @param _to is where the tokens will be sent to
	 *        _value is the number of the token
     *        _fee is the amount of the transferring costs
     *        —tokenReturn is the address that return back the tokens of the _fee
	 */
    function withdrawToken(address _token, address _params, uint256 _time, address _to, uint256 _value, uint256 _fee, address _tokenReturn) public onlyOwner whenNotPaused returns (bool) {
        require(_to != address(0));
        require(_token != address(0));
        require(_value > _fee);
        // require(_tokenReturn != address(0));

        DRCWalletMgrParams params = DRCWalletMgrParams(_params);
        require(_value <= params.singleWithdraw());

        uint256 daysCount = _time.div(86400);
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

        ERC20 tk = ERC20(_token);
        uint256 realAmount = _value.sub(_fee);
        require(tk.transfer(_to, realAmount));
        if (_tokenReturn != address(0) && _fee > 0) {
            require(tk.transfer(_tokenReturn, _fee));
        }

        withdrRecs.push(TransferRecord(_time, _to, realAmount));
        emit WithdrawToken(_token, _to, realAmount);

        return true;
    }

    /**
	 * @dev withdraw tokens, send tokens to target default wallet
     *
     * @param _token the token address that will be withdraw
     * @param _time the timestamp occur the withdraw record
	 * @param _value is the number of the token
     *        _fee is the amount of the transferring costs
     *        —tokenReturn is the address that return back the tokens of the _fee
	 */
    function withdrawTokenToDefault(address _token, address _params, uint256 _time, uint256 _value, uint256 _fee, address _tokenReturn) public onlyOwner whenNotPaused returns (bool) {
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

contract DRCWalletManager is OwnerContract, withdrawable, Destructible, TokenDestructible {
    using SafeMath for uint256;

    struct WithdrawWallet {
        bytes32 name;
        address walletAddr;
    }

    struct DepositRepository {
        // uint256 balance;
        uint256 frozen;
        WithdrawWallet[] withdrawWallets;
        // mapping (bytes32 => address) withdrawWallets;
    }

    mapping (address => DepositRepository) depositRepos;
    mapping (address => address) walletDeposits;
    mapping (address => bool) public frozenDeposits;

    ERC20 public tk;
    DRCWalletMgrParams params;
    // address public tokenReturn;
    // uint256 public chargeFee;
    
    event CreateDepositAddress(address indexed _wallet, address _deposit);
    event FrozenTokens(address indexed _deposit, uint256 _value);
    event ChangeDefaultWallet(address indexed _oldWallet, address _newWallet);

    /**
	 * @dev withdraw tokens, send tokens to target default wallet
     *
     * @param _token the token address that will be withdraw
     * @param _walletParams the wallet management parameters
	 */
    function bindToken(address _token, address _walletParams) onlyOwner public returns (bool) {
        require(_token != address(0));
        require(_walletParams != address(0));

        tk = ERC20(_token);
        params = DRCWalletMgrParams(_walletParams);
        return true;
    }

    function createDepositContract(address _wallet) onlyOwner public returns (address) {
        require(_wallet != address(0));

        DepositWithdraw deposWithdr = new DepositWithdraw(_wallet);
        address _deposit = address(deposWithdr);
        walletDeposits[_wallet] = _deposit;
        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        withdrawWalletList.push(WithdrawWallet("default wallet", _wallet));
        // depositRepos[_deposit].balance = 0;
        depositRepos[_deposit].frozen = 0;

        emit CreateDepositAddress(_wallet, address(deposWithdr));
        return deposWithdr;
    }

    function getDepositAddress(address _wallet) onlyOwner public view returns (address) {
        require(_wallet != address(0));
        address deposit = walletDeposits[_wallet];

        return deposit;
    }

    function getDepositInfo(address _deposit) onlyOwner public view returns (uint256, uint256) {
        require(_deposit != address(0));
        uint256 _balance = tk.balanceOf(_deposit);
        uint256 frozenAmount = depositRepos[_deposit].frozen;
        // depositRepos[_deposit].balance = _balance;

        return (_balance, frozenAmount);
    }

    function getDepositWithdrawCount(address _deposit) onlyOwner public view returns (uint) {
        require(_deposit != address(0));

        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        uint len = withdrawWalletList.length;

        return len;
    }

    function getDepositWithdrawList(address _deposit, uint[] _indices) onlyOwner public view returns (bytes32[], address[]) {
        require(_indices.length != 0);

        bytes32[] memory names = new bytes32[](_indices.length);
        address[] memory wallets = new address[](_indices.length);
        
        for (uint i = 0; i < _indices.length; i = i.add(1)) {
            WithdrawWallet storage wallet = depositRepos[_deposit].withdrawWallets[_indices[i]];
            names[i] = wallet.name;
            wallets[i] = wallet.walletAddr;
        }
        
        return (names, wallets);
    }

    function changeDefaultWithdraw(address _oldWallet, address _newWallet) onlyOwner public returns (bool) {
        require(_newWallet != address(0));
        
        address deposit = walletDeposits[_oldWallet];
        DepositWithdraw deposWithdr = DepositWithdraw(deposit);
        require(deposWithdr.setWithdrawWallet(_newWallet));

        WithdrawWallet[] storage withdrawWalletList = depositRepos[deposit].withdrawWallets;
        withdrawWalletList[0].walletAddr = _newWallet;
        emit ChangeDefaultWallet(_oldWallet, _newWallet);

        return true;
    }

    function freezeTokens(address _deposit, uint256 _value) onlyOwner public returns (bool) {
        require(_deposit != address(0));
        
        frozenDeposits[_deposit] = true;
        depositRepos[_deposit].frozen = _value;

        emit FrozenTokens(_deposit, _value);
        return true;
    }

    function withdrawWithFee(address _deposit, uint256 _time, uint256 _value) onlyOwner public returns (bool) {
        require(_deposit != address(0));

        uint256 _balance = tk.balanceOf(_deposit);
        require(_value <= _balance);

        // depositRepos[_deposit].balance = _balance;
        uint256 frozenAmount = depositRepos[_deposit].frozen;
        require(_value <= _balance.sub(frozenAmount));

        DepositWithdraw deposWithdr = DepositWithdraw(_deposit);
        return (deposWithdr.withdrawTokenToDefault(address(tk), address(params), _time, _value, params.chargeFee(), params.chargeFeePool()));
    }

    function checkWithdrawAddress(address _deposit, bytes32 _name, address _to) public view returns (bool, bool) {
        uint len = depositRepos[_deposit].withdrawWallets.length;
        for (uint i = 0; i < len; i = i.add(1)) {
            WithdrawWallet storage wallet = depositRepos[_deposit].withdrawWallets[i];
            if (_name == wallet.name) {
                return(true, (_to == wallet.walletAddr));
            }
        }

        return (false, true);
    }

    /**
	 * @dev withdraw tokens, send tokens to target default wallet
     *
     * @param _deposit the deposit address that will be withdraw from
     * @param _time the timestamp occur the withdraw record
	 * @param _name the withdraw address alias name to verify
     * @param _to the address the token will be transfer to 
     * @param _value the token transferred value
     * @param _check if we will check the value is valid
	 */
    function withdrawWithFee(address _deposit, 
                             uint256 _time, 
                             bytes32 _name, 
                             address _to, 
                             uint256 _value, 
                             bool _check) onlyOwner public returns (bool) {
        require(_deposit != address(0));
        require(_to != address(0));

        uint256 _balance = tk.balanceOf(_deposit);
        if (_check) {
            require(_value <= _balance);
        }

        // depositRepos[_deposit].balance = _balance;
        // uint256 frozenAmount = depositRepos[_deposit].frozen;
        uint256 available = _balance.sub(depositRepos[_deposit].frozen);
        if (_check) {
            require(_value <= available);
        }

        bool exist;
        bool correct;
        WithdrawWallet[] storage withdrawWalletList = depositRepos[_deposit].withdrawWallets;
        (exist, correct) = checkWithdrawAddress(_deposit, _name, _to);
        if(!exist) {
            withdrawWalletList.push(WithdrawWallet(_name, _to));
        } else if(!correct) {
            return false;
        }

        if (!_check && _value > available) {
            tk.transfer(_deposit, _value.sub(available));
            _value = _value.sub(available);
        }

        DepositWithdraw deposWithdr = DepositWithdraw(_deposit);
        return (deposWithdr.withdrawToken(address(tk), address(params), _time, _to, _value, params.chargeFee(), params.chargeFeePool()));        
    }

}