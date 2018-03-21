$(function () {　　
    // 调用服务器的方法名
    const functionName = ['insertHash', 'selectHash'];
    // 服务器url
    //const serverUrl = "http://192.168.2.100:3000";
    const serverUrl = "http://192.168.100.123:3000";
    // 操作耗时
    let timeStart = 0;
    let timeEnd = 0;


    // “提交”按钮的点击事件
    let insertHash = function () {　
        let hash = $("#hash").val().trim();
        // 前处理
        clearResultArea();
        if (!checkInput(hash)) {
            $("#error").html("ERRO: 请正确输入64位Hash值 <br>");
            $('#loader').hide();
            return;
        };
        // 输入check通过之后，防止二重提交
        $("#insertHash,#selectHash").attr("disabled", true);
        timeStart = new Date();

        $.ajax({　　　　　　
            url: serverUrl,
            method: "POST",
            data: {
                functionName: functionName[0],
                hash: hash
            },
            success: function (data) {
                timeEnd = new Date();
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#insertHash,#selectHash").attr("disabled", false);

                if (!data) {
                    $("#error").html("ERRO: 服务器返回值为空 <br>");
                    return;
                } else if (data == '{}') {
                    $("#acctionResult").html("上链 失败： 输入了重复的Hash值<br>");
                    return;
                };　　　　　　　
                let dataObject = $.parseJSON(data);

                $("#acctionResult").html("上链 成功<br>");
                //上链后，server端的返回值
                $("#txHash").html("txHash " + dataObject.receipt.transactionHash ||
                    "empty data");
                $('#gasUsed').html("gasUsed " + dataObject.receipt.gasUsed ||
                    "empty data");
                $('#gasPrice').html("gasPrice " + parseInt(dataObject.gasPrice) +
                    " wei " ||
                    "empty data");
                $("#timer").html("耗时 " + (timeEnd - timeStart) / 1000 + " s");
            },
            error: function (err) {
                console.log("ERRO: ", err);
                $("#error").html("ERRO: 请求失败 <br>");
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#insertHash,#selectHash").attr("disabled", false);
            }　　　　
        });　　
    };
    // “获取链上信息”按钮的点击事件
    let selectHash = function () {
        let hash = $("#hash").val().trim();
        // 前处理
        clearResultArea();
        if (!checkInput(hash)) {
            $("#error").html("ERRO: 请正确输入64位Hash值 <br>");
            $('#loader').hide();
            return;
        };
        // 输入check通过之后，防止二重提交
        $("#insertHash,#selectHash").attr("disabled", true);
        timeStart = new Date();

        $.ajax({　
            url: serverUrl,
            method: "POST",
            data: {
                functionName: functionName[1],
                hash: hash
            },
            success: function (data) {
                timeEnd = new Date();
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#insertHash,#selectHash").attr("disabled", false);
                if (!data) {
                    $("#error").html("ERRO: 服务器返回值为空 <br>");
                    return;
                } else if (data == '{}') {
                    $("#acctionResult").html("服务器的Socket连接出错<br>");
                    return;
                };
                let dataObject = $.parseJSON(data);

                //链上查询返回值第一个为true：查询到了该数据
                if (dataObject.result[0] != undefined && dataObject.result[0]) {
                    $("#acctionResult").html("查询 成功<br>");
                    let time = new Date(dataObject.result[2] * 1000).toLocaleString();

                    let infoTemp = `上链账号 ${dataObject.result[1] || "empty data" } <br><br> 上链时间 ${time || "empty data"}`;
                    $("#info").html(infoTemp || "empty data");
                    $("#timer").html("耗时 " + (timeEnd - timeStart) / 1000 + " s");

                    return;
                }
                $("#acctionResult").html("查询 无结果<br>");

            },
            error: function (err) {
                console.log("ERRO: ", err);
                $("#error").html("ERRO: 请求失败 <br>");
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#insertHash,#selectHash").attr("disabled", false);
            }　
        })
    }

    // 绑定“提交”按钮的点击事件
    $("#insertHash").on("click", insertHash);

    // 绑定“获取链上信息”按钮的点击事件
    $("#selectHash").on("click", selectHash);

    // 检查输入值是否符合
    function checkInput(hash) {
        return hash.length == 64;
    }
    // 清空结果区域，显示遮罩
    function clearResultArea() {
        // 清空查询结果区域与错误信息区域
        $('#resultArea').children().html("");
        // 显示加载遮罩
        $('#loader').show();
    }
});