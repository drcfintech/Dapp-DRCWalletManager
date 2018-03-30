// 非对称加密 https://nodejs.org/api/crypto.html#crypto_verify_verify_object_signature_signatureformat

/*
 * 私钥加密，公钥验签
 * 参数  message: data(前64位) + sign(除去data的剩余数据)
 */
const fs = require('fs');
const crypto = require('crypto');

module.exports = {
    validate: (message) => {
        // 获取公钥字符串
        let publicPem = fs.readFileSync(__dirname + '/key/key-cert.pem');
        let publickey = publicPem.toString();
        // ---------------公钥验签开始---------------
        let verify = crypto.createVerify('RSA-SHA256');

        // 取得原文
        let inputData = message.slice(0, 64);
        // 签名之后的数据
        let inputSig = message.slice(64);

        verify.update(inputData);

        let result = verify.verify(publickey, inputSig, 'hex');
        // console.log('公钥验签结果', result);

        return result;
    }
};