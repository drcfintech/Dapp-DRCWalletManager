#!/usr/bin/env node

// 'use strict';

const Web3 = require('web3');


var timeseconds = new Date(2018,4,11,9,0,0).getTime() / 1000 + 86400 * 90;
console.log(timeseconds);
console.log(86400 * 365 * 2);
console.log(Math.round((Date.now() + 60 * 1000) / 1000));

// var realValue = Web3.utils.toHex(10000 * 1e18); 
// console.log("real withdraw value is ", realValue);

let getRealValue = (value) => {
    var temp = value.toFixed(18);
    console.log("temp is ", temp);
    var total = Number.parseInt(temp * 1e18);
    console.log("total is ", total);
    // web3.utils.toBN(requestObject.value).mul(web3.utils.toBN(DECIMAL));
    var multiple = Math.floor(total / 1e18);
    var left = total % 1e18;
    // return Web3.utils.toBN(multiple).mul(Web3.utils.toBN(1e18)).add(Web3.utils.toBN(left));
    return Web3.utils.toBN(total);
}
console.log("real withdraw value is ", getRealValue(101200334334333.1111));
//var nowtime = new Date().getTime() / 1000;
//console.log(nowtime);
//var newtime = new Date(1520867875 * 1000);
//console.log(newtime);
//var endtime = new Date(2018, 2, 12, 14, 5, 17).getTime() / 1000;
//var mul = (1520867875 - endtime) / 600;
//console.log(mul);

