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
    uint256 public singleWithdrawMin; // min value of single withdraw
    uint256 public singleWithdrawMax; // Max value of single withdraw
    uint256 public dayWithdraw; // Max value of one day of withdraw
    uint256 public monthWithdraw; // Max value of one month of withdraw
    uint256 public dayWithdrawCount; // Max number of withdraw counting

    uint256 public chargeFee; // the charge fee for withdraw
    address public chargeFeePool; // the address that will get the returned charge fees.


    function initialSingleWithdrawMax(uint256 _value) onlyOwner public {
        require(!init);

        singleWithdrawMax = _value;
    }

    function initialSingleWithdrawMin(uint256 _value) onlyOwner public {
        require(!init);

        singleWithdrawMin = _value;
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

        chargeFee = _value;
    }

    function initialChargeFeePool(address _pool) onlyOwner public {
        require(!init);

        chargeFeePool = _pool;
    }    

    function setSingleWithdrawMax(uint256 _value) onlyCongress public {
        singleWithdrawMax = _value;
    }   

    function setSingleWithdrawMin(uint256 _value) onlyCongress public {
        singleWithdrawMin = _value;
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
        chargeFee = _value;
    }

    function setChargeFeePool(address _pool) onlyOwner public {
        chargeFeePool = _pool;
    }
}