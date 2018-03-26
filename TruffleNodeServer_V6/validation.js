// 非对称加密 https://nodejs.org/api/crypto.html#crypto_verify_verify_object_signature_signatureformat

// 私钥加密，公钥验签
module.exports = {
    validation: () => {
        var crypto = require('crypto');
        var fs = require('fs');

        function veryfy(privateKey, publicKey) {
            // 获取公钥私钥字符串
            var privatePem = fs.readFileSync(privateKey);
            var publicPem = fs.readFileSync(publicKey);

            var privatekey = privatePem.toString();
            var publickey = publicPem.toString();

            // 要加密的数据
            var data = "ee0fadc8dad2fc978f48b7a5897dc5fa5f1f0c5bbf9ee66779690b773682918c";

            dataHash = crypto.createHash("sha256").update(data, "utf8").digest("hex");

            console.log('dataHash = > ', dataHash);


            // 私钥签名
            var sign = crypto.createSign('RSA-SHA256');
            sign.update(data);
            var sig = sign.sign(privatekey, 'hex');



            // ---------------公钥验签开始---------------
            var verify = crypto.createVerify('RSA-SHA256');
            // 取得原文
            verify.update(data);
            //verify.update(dataHash);
            console.log('verify = >', verify);

            // 1.验证Hash（原文）， 验证签名（用公钥验证私钥是否匹配）
            console.log('公钥验签结果', verify.verify(publickey, sig, 'hex'));
            console.log('sign', sig);
        }

        veryfy('./key/key.pem', './key/key-cert.pem');
        // veryfy('./key/key02.pem', './key/key-cert02.pem');

        // veryfy('./key/key.pem', './key/key-cert02.pem');
        // veryfy('./key/key02.pem', './key/key-cert.pem');

    }
};