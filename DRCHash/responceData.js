module.exports = {
    depositAlreadyExist: {
        status: "success",
        msg: "输入的钱包地址已经有对应的充值地址"
    },
    lowBalance: {
        status: "failed",
        msg: "上链账号余额不足"
    },
    notEnoughBalance: {
        status: "failed",
        msg: "提现余额不足"
    },
    evmError: {
        status: "failed",
        msg: "以太坊虚拟机异常"
    },
    programError: {
        status: "failed",
        msg: "程序异常"
    },
    addressError: {
        status: "failed",
        msg: "地址不合法"
    },
    dataError: {
        status: "failed",
        msg: "非法请求"
    },
    transactionError: {
        status: "failed",
        msg: "交易异常或失败"
    },
    gasPriceTooHigh: {
        status: 'failed',
        msg: '目前以太坊拥堵，交易价格超过32Gwei，费用过高'
    },
    ethStatusSuccess: {
        status: 'success',
        msg: '以太坊网络正常'
    },
    getDepositAddrSuccess: {
        status: "success",
        msg: "获取充值地址成功"
    },
    getDepositInfoSuccess: {
        status: "success",
        msg: "获取充值余额成功"
    },
    getDepositTxSuccess: {
        status: "success",
        msg: "获取充值记录成功"
    },
    getTxsBlocksSuccess: {
        status: "success",
        msg: "获取交易块号成功"
    },
    getDepositTxDetailSuccess: {
        status: "success",
        msg: "获取充值记录详细信息成功"
    },
    getDepositAddrFailed: {
        status: "failed",
        msg: "获取充值地失败"
    },
    getDepositInfoFailed: {
        status: "failed",
        msg: "获取充值余额失败"
    },
    withdrawTxSuccess: {
        status: "success",
        msg: "提现交易生成"
    },
    withdrawSuccess: {
        status: "success",
        msg: "提现成功"
    },
    withdrawFailed: {
        status: "failed",
        msg: "提现交易失败"
    },
    doDepositTxSuccess: {
        status: "success",
        msg: "充值记录交易生成"
    },
    doDepositFailed: {
        status: "failed",
        msg: "添加充值记录失败"
    },
    createDepositAddrSuccess: {
        status: "success",
        msg: "创建充值地址成功"
    },
    validationFailed: {
        status: "failed",
        msg: "验签失败"
    },
    hashAlreadyInserted: {
        status: "failed",
        msg: "存证Hash已经存在"
    },
    selectHashSuccess: {
        status: "success",
        msg: "上链数据查询成功"
    },
    selectHashFailed: {
        status: "failed",
        msg: "上链数据查询失败"
    },
    insertHashSuccess: {
        status: "success",
        msg: "数据上链成功"
    }
}