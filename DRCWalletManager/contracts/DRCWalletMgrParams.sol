pragma solidity ^0.4.23;


import 'zeppelin-solidity/contracts/ownership/Claimable.sol';
import 'zeppelin-solidity/contracts/lifecycle/Destructible.sol';
import './Autonomy.sol';


/**
 * contract that define the wallet management parameters on DRC platform
 * only owner could initialize the parameters, but the congress contract 
 * could set the parameters in the future
 */
contract DRCWalletMgrParams is Claimable, Autonomy, Destructible {
    uint256 public singleWithdraw; // Max value of single withdraw
    uint256 public dayWithdraw; // Max value of one day of withdraw
    uint256 public monthWithdraw; // Max value of one month of withdraw
    uint256 public dayWithdrawCount; // Max number of withdraw counting

    uint256 public chargeFee; // the charge fee for withdraw
    address public chargeFeePool; // the address that will get the returned charge fees.


    function initialSingleWithdraw(uint256 _value) onlyOwner public {
        require(!init);

        singleWithdraw = _value;
    }

    function initialDayWithdraw(uint256 _value) onlyOwner public {
        require(!init);

        dayWithdraw = _value;
    }

    function initialDayWithdrawCount(uint256 _count) onlyOwner public {
        require(!init);

        dayWithdrawCount = _count;
    }

    function initialMonthWithdraw(uint256 _value) onlyOwner public {
        require(!init);

        monthWithdraw = _value;
    }

    function initialChargeFee(uint256 _value) onlyOwner public {
        require(!init);

        singleWithdraw = _value;
    }

    function initialChargeFeePool(address _pool) onlyOwner public {
        require(!init);

        chargeFeePool = _pool;
    }    

    function setSingleWithdraw(uint256 _value) onlyCongress public {
        singleWithdraw = _value;
    }

    function setDayWithdraw(uint256 _value) onlyCongress public {
        dayWithdraw = _value;
    }

    function setDayWithdrawCount(uint256 _count) onlyCongress public {
        dayWithdrawCount = _count;
    }

    function setMonthWithdraw(uint256 _value) onlyCongress public {
        monthWithdraw = _value;
    }

    function setChargeFee(uint256 _value) onlyCongress public {
        singleWithdraw = _value;
    }

    function setChargeFeePool(address _pool) onlyOwner public {
        chargeFeePool = _pool;
    }
}