module.exports = {
    wrongFunctionName: {
        status: "failed",
        msg: "前台的传参(functionName)错误"
    },
    hashAlreadyInserted: {
        status: "failed",
        msg: "输入了重复的Hash值"
    },
    lowBalance: {
        status: "failed",
        msg: "上链账号余额不足"
    },
    evmError: {
        status: "failed",
        msg: "EVM抛出异常"
    },
    selectHashSuccess: {
        status: "success",
        msg: "查询成功"
    },
    selectHashFailed: {
        status: "failed",
        msg: "查询失败"
    },
    insertHashSuccess: {
        status: "success",
        msg: "上链成功"
    }
}