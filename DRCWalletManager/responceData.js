module.exports = {
    depositAlreadyExist: {
        status: "failed",
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
        msg: "其他"
    },
    getDepositAddrSuccess: {
        status: "success",
        msg: "获取充值地址成功"
    },
    withdrawSuccess: {
        status: "success",
        msg: "提现成功"
    },
    withdrawFailed: {
        status: "failed",
        msg: "提现失败"
    },
    selectHashFailed: {
        status: "failed",
        msg: "获取充值地址失败"
    },
    createDepositAddrSuccess: {
        status: "success",
        msg: "创建充值地址成功"
    },
    validationFailed: {
        status: "failed",
        msg: "验签失败"
    }
}