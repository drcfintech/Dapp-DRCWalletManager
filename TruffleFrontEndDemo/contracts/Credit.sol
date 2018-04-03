pragma solidity ^0.4.2;

contract Credit {

    event createRecord(address indexed _address, string identity, uint price, string dataHash);

    string a;
    uint b;
    string c;

    function create(string identity, uint256 price, string dataHash) public {
        a = identity;
        b = price;
        c = dataHash;
        createRecord(msg.sender, identity, price, dataHash);
    }

    function all() public view returns (string, uint, string) {
        return(a, b, c);
    }

}