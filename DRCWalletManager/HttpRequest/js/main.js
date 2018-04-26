$(function () {　　
    // 服务器url
    // const serverUrl = "http://127.0.0.1:3050";
    const serverUrl = "http://dapp.dev.rcitech.cn:5030";
    //const serverUrl = "http://192.168.100.123:3050";
    // 操作耗时
    let timeStart = 0;
    let timeEnd = 0;
    let status = {
        statusFailed: "failed",
        statusSuccess: "success"
    }


    // “提交”按钮的点击事件
    let createDepositAddr = function () {　
        let hash = $("#hash").val().trim();
        // 前处理
        clearResultArea();
        if (!checkInput(hash)) {
            $("#error").html("ERRO: 请正确输入40位地址值，以0x开头 <br>");
            $('#loader').hide();
            return;
        };
        // 输入check通过之后，防止二重提交
        $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", true);
        timeStart = new Date();

        $.ajax({　　　　　　
            url: serverUrl + '/createDepositAddr',
            method: "POST",
            data: {
                hash: hash
            },
            success: function (data) {
                timeEnd = new Date();
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", false);

                if (!data) {
                    $("#error").html("ERRO: 服务器返回值为空 <br>");
                    return;
                }
                let dataObject = $.parseJSON(data);　　　　　　
                $("#acctionResult").html("操作状态 " + dataObject.status + "  " + dataObject.msg);
                if (dataObject.status == status.statusFailed) return;
                //上链后，server端的返回值
                $("#txHash").html("txHash " + dataObject.txHash ||
                    "empty data");
                $('#gasUsed').html("gasUsed " + dataObject.gasUsed ||
                    "empty data");
                $('#gasPrice').html("gasPrice " + parseInt(dataObject.gasPrice) +
                    " gwei " ||
                    "empty data");
                $('#depositAddress').html("depositAddress " + dataObject.depositAddr ||
                    "empty data");
                $("#timer").html("耗时 " + (timeEnd - timeStart) / 1000 + " s");
            },
            error: function (err) {
                console.log("ERRO: ", err);
                $("#error").html("ERRO: 请求失败 <br>");
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", false);
            }　　　　
        });　　
    };
    // “获取链上信息”按钮的点击事件
    let getDepositAddr = function () {
        let hash = $("#hash").val().trim();
        // 前处理
        clearResultArea();
        if (!checkInput(hash)) {
            $("#error").html("ERRO: 请正确输入40位地址值，以0x开头 <br>");
            $('#loader').hide();
            return;
        };
        // 输入check通过之后，防止二重提交
        $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", true);
        timeStart = new Date();

        $.ajax({　
            url: serverUrl + "/getDepositAddr",
            method: "POST",
            data: {
                hash: hash
            },
            success: function (data) {
                timeEnd = new Date();
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", false);
                if (!data) {
                    $("#error").html("ERRO: 服务器返回值为空 <br>");
                    return;
                }
                let dataObject = $.parseJSON(data);　　　　　　
                $("#acctionResult").html("操作状态 " + dataObject.status + "  " + dataObject.msg);
                if (dataObject.status == status.statusFailed) return;
                //链上查询返回值第一个为false：该hash没有上链记录

                // let time = new Date(dataObject.data[2] * 1000).toLocaleString();

                let infoTemp = `充值地址 ${dataObject.data || "empty data" } <br><br>`;
                $("#info").html(infoTemp || "empty data");

                $("#timer").html("耗时 " + (timeEnd - timeStart) / 1000 + " s");

            },
            error: function (err) {
                console.log("ERRO: ", err);
                $("#error").html("ERRO: 请求失败 <br>");
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", false);
            }　
        })
    }
    
    // “获取链上信息”按钮的点击事件
    let withdraw = function () {
        let hash = $("#hash").val().trim();
        let value = $("#value").val().trim();
        // 前处理
        clearResultArea();
        if (!checkInput(hash)) {
            $("#error").html("ERRO: 请正确输入40位地址值，以0x开头 <br>");
            $('#loader').hide();
            return;
        };

        if (!checkValue(value)) {
            $("#error").html("ERRO: 请输入大于0的数 <br>");
            $('#loader').hide();
            return;
        }
        // 输入check通过之后，防止二重提交
        $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", true);
        timeStart = new Date();

        $.ajax({　
            url: serverUrl + "/withdraw",
            method: "POST",
            data: {
                depositAddress: hash,
                value: value
            },
            success: function (data) {
                timeEnd = new Date();
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", false);
                if (!data) {
                    $("#error").html("ERRO: 服务器返回值为空 <br>");
                    return;
                }
                let dataObject = $.parseJSON(data);　　　　　　
                $("#acctionResult").html("操作状态 " + dataObject.status + "  " + dataObject.msg);
                if (dataObject.status == status.statusFailed) return;
                //链上查询返回值第一个为false：该hash没有上链记录

                $("#txHash").html("txHash " + dataObject.txHash ||
                    "empty data");
                $('#gasUsed').html("gasUsed " + dataObject.gasUsed ||
                    "empty data");
                $('#gasPrice').html("gasPrice " + parseInt(dataObject.gasPrice) +
                    " gwei " ||
                    "empty data");
                // $('#depositAddress').html("depositAddress " + dataObject.depositAddr ||
                    // "empty data");
                $("#timer").html("耗时 " + (timeEnd - timeStart) / 1000 + " s");

            },
            error: function (err) {
                console.log("ERRO: ", err);
                $("#error").html("ERRO: 请求失败 <br>");
                // 隐藏加载遮罩
                $('#loader').hide();
                // 恢复按钮功能样式
                $("#createDepositAddr,#getDepositAddr,#withdraw").attr("disabled", false);
            }　
        })
    }


    // 绑定“提交”按钮的点击事件
    $("#createDepositAddr").on("click", createDepositAddr);

    // 绑定“获取链上信息”按钮的点击事件
    $("#getDepositAddr").on("click", getDepositAddr);

    // 绑定“提交”按钮的点击事件
    $("#withdraw").on("click", withdraw);

    // 检查输入值是否符合 64hash + 512signature
    function checkInput(hash) {
        return hash.length == 42;
    }

    // 检查输入值是否符合 64hash + 512signature
    function checkValue(value) {
        return value > 0;
    }

    // 清空结果区域，显示遮罩
    function clearResultArea() {
        // 清空查询结果区域与错误信息区域
        $('#resultArea').children().html("");
        // 显示加载遮罩
        $('#loader').show();
    }
});