let dates = [];
let actualData = [];
let passData = [];
let targetData = [];
let initData = [];

$(document).ready(function() {
    // ローカルストレージの有無で初期表示を判定する
    if (localStorage.getItem('startDate')) {
        // ローカルストレージを元に復元する
        $('#startDate').val(localStorage.getItem('startDate'));
        $('#endDate').val(localStorage.getItem('endDate'));
        $('#targetPoint').val(localStorage.getItem('targetPoint') || '');

        // 開始日終了日非活性
        document.getElementById('startDate').disabled = true;
        document.getElementById('endDate').disabled = true;
        
        // 決定ボタンを隠す
        document.getElementById("decision").style.display = 'none';

        // テーブルとグラフの作成
        createTableGraph();
    } else {
        // 日付の初期値設定
        setDefaultDates();
        // クリアボタンを隠す
        document.getElementById("clear").style.display = 'none';
    }
});


/**
 * @function 決定ボタン押下
 */
function decision() {
    const startDate = new Date($('#startDate').val());
    const endDate = new Date($('#endDate').val());
    const targetPoint = parseInt($('#targetPoint').val()) || 0;

    // 入力チェック
    if (!startDate || !endDate || isNaN(targetPoint)) {
        alert('開始日、終了日、目標ポイントを正しく入力してください。');
        return;
    }

    // ローカルストレージに保存
    localStorage.setItem('startDate', $('#startDate').val());
    localStorage.setItem('endDate', $('#endDate').val());
    localStorage.setItem('targetPoint', targetPoint);

    // 開始日終了日非活性
    document.getElementById('startDate').disabled = true;
    document.getElementById('endDate').disabled = true;
    
    // 決定ボタンを隠す
    document.getElementById("decision").style.display = 'none';
    // クリアボタンを表示する
    document.getElementById("clear").style.display = null;

    // テーブルとグラフの作成
    createTableGraph();
}


/**
 * @function テーブルとグラフの作成
 */
function createTableGraph() {
    // 開始日終了日から日付配列を作成
    let currentDate = new Date($('#startDate').val());
    const endDate = new Date($('#endDate').val());
    dates = [];
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }

    // グラフデータの配列を作成
    const period = dates.length;
    const targetPoint = parseInt($('#targetPoint').val()) || 0;
    const dailyTarget = targetPoint / period;

    for (i=0; i<period; i++) {
        const date = formatDate(dates[i], '-');
        const points = parseInt(localStorage.getItem('point_' + i)) || 'null';
        const pass = parseInt(localStorage.getItem('pass_' + i)) || 0;
        actualData.push([date, points]);
        passData.push([date, points !== 'null' ? (points + pass) : 'null']);
        targetData.push([date, Math.round(dailyTarget * (i + 1))]);
        initData.push([date, 0]);
    }

    // テーブルの作成
    createTable();
    // チェックボックス表示
    $('.checkbox-section').show();
    // グラフの作成
    drawGraph();

}

/**
 * @function テーブル作成
 */
function createTable() {
    // 入力ポイントのテーブルを作成
    const tbody = $('#inputTable');
    tbody.empty();
    dates.forEach((date, index) => {
        date = formatDate(date);
        const savedPoints = localStorage.getItem(`point_${index}`) || '';
        const savedPass = localStorage.getItem(`pass_${index}`) || '';
        tbody.append(`
            <tr>
                <td>${date}</td>
                <td><input type="number" name="point" class="point-input" value="${savedPoints}" min="0" onblur="inputPoint(${index})"></td>
                <td><input type="number" name="pass" class="pass-input" value="${savedPass}" min="0" onblur="inputPass(${index})"></td>
            </tr>
        `);
    });
    
    // テーブル表示
    $('.point-inputs').show();
}


/**
 * @function グラフ作成
 */
function drawGraph() {

    $('#chart').empty();
    const plotData = [];
    const series = [];
    // グラフが全くないとおかしくなるのでダミーデータを準備
//    plotData.push(initData);
//    series.push({showLine: false, showMarker: false});

    if ($('#showTarget').is(':checked')) {
        plotData.push(targetData);
        series.push({label: '目標値', color: '#c2d294', shadow: false});
    } else {
        // グラフが全くないとおかしくなるのでダミーデータを準備
        plotData.push(initData);
        series.push({showLine: false, showMarker: false});
    }

    if ($('#showPass').is(':checked')) {
        plotData.push(passData);
        series.push({label: 'パス値', color: '#a4d0ed', shadow: false});
    }
    
    if ($('#showActual').is(':checked')) {
        plotData.push(actualData);
        series.push({label: '現在値', color: '#f2bcbc', shadow: false});
    }

    let plot = $.jqplot('chart', plotData, {
        title: 'イベントスコア進捗',
        axes: {
            xaxis: {
                renderer: $.jqplot.DateAxisRenderer,
                rendererOptions: {
                    tickRenderer: $.jqplot.CanvasAxisTickRenderer
                },
                tickInterval: '1 day',
                tickOptions: {
                    formatString: '%#m月%#d日',
                    angle: -45,
                    textColor: '#957e85'
                }
            },
            yaxis: {
                min: 0,
                tickOptions: {
                    textColor: '#957e85'
                }
            }
        },
        seriesDefaults: {
            markerOptions: {shadow: false}
        },
        series: series,
        grid: {
            shadow: false,
            gridLineColor: '#d3b09e',
            borderColor: '#c39c89'
        },
        highlighter: {
            show: true,
            tooltipLocation: 'n',
            tooltipContentEditor: function(str, seriesIndex, pointIndex, plot) {
            
                if (seriesIndex === 0 && !($('#showTarget').is(':checked'))) {
                    return "";
                }
                // ツールチップの位置を調整する
                if (pointIndex < 1) {
                    plot.plugins.highlighter.tooltipLocation = "ne";
                } else if (pointIndex < dates.length - 1) {
                    plot.plugins.highlighter.tooltipLocation = "n";
                } else {
                    plot.plugins.highlighter.tooltipLocation = "nw";
                }

                // 初期化
                let target = "null";
                let pass = "null";
                let actual = "null";
                plot.data.forEach((date, index) => {
                    if (plot.series[index].label == "目標値") {
                        target = date[pointIndex][1];
                    } else  if (plot.series[index].label == "現在値") {
                        actual = date[pointIndex][1];
                        // パスと実際の値が同じならパスの値は表示しない
                        if (actual === pass) {
                            pass = "null";
                        }
                    } else if (plot.series[index].label == "パス値") {
                        pass = date[pointIndex][1];
                    }
                });
                
                // ツールチップの中身を作成する
                let content = '<table class="jqplot-highlighter" style="background-color:white;">';
                content = content + '<td colspan="2" style="text-align: center;">' + str.match(/\d{1,2}月\d{1,2}日/)  + '</td>';

                if (target !== "null") {
                    content = content + `<tr><td>目標値:</td><td>${target}</td></tr>`;
                }
                if (actual !== "null") {
                    content = content + `<tr><td>現在値:</td><td>${actual}</td></tr>`;
                }
                if (pass !== "null") {
                    content = content + `<tr><td>パス値:</td><td>${pass}</td></tr>`;
                }
                // 差分を計算
                if (target !== "null" && actual !== "null") {
                    const diffActual = actual - target;
                    const colorActual = diffActual < 0 ? 'red' : 'blue';
                    content = content + `<tr><td>現在差分:</td><td style="color:${colorActual}">${diffActual}</td></tr>`;
                }
                if (target !== "null" && pass !== "null") {
                    const diffPass = pass - target;
                    const colorPass = diffPass < 0 ? 'red' : 'blue';
                    content = content + `<tr><td>パス差分:</td><td style="color:${colorPass}">${diffPass}</td></tr>`;
                }
                content = content + `</table>`;
                
                return content;
            }
        }
    });
    
    // 再描画するとおかしいのなおる
    plot.replot();
}


/**
 * @function ポイント入力
 * @param index
 */
function inputPoint(index) {
    const point = document.getElementsByName("point")[index].value;
    if (point) {
        // ローカルストレージに保存
        localStorage.setItem(`point_${index}`, point);
        actualData[index][1] = parseInt(point);
        
        const pass = document.getElementsByName("pass")[index].value;
        // パスの計算も一緒に行う
        if (pass) {
            passData[index][1] = parseInt(point) + parseInt(pass);
        } else {
            passData[index][1] = parseInt(point);
        }
    } else {
        // ローカルストレージの除去とグラフのマッピングを削除
        localStorage.removeItem(`point_${index}`);
        actualData[index][1] = 'null';
        passData[index][1] = 'null';
        // 一つ目の配列の場合、値がおかしくなる場合があるため、0を代入する
//        if () {
//        }
    }
    // グラフの描画
    drawGraph();
}

/**
 * @function パス入力
 * @param index
 */
function inputPass(index) {
    const pass = document.getElementsByName("pass")[index].value;
    const point = document.getElementsByName("point")[index].value;
    if (pass) {
        // ローカルストレージに保存
        localStorage.setItem(`pass_${index}`, pass);

        // ポイントに入力がある場合のみ、グラフを描画する
        if (point) {
            passData[index][1] = parseInt(point) + parseInt(pass);
        }
    } else {
        // ローカルストレージの除去とグラフのマッピングを削除
        localStorage.removeItem(`pass_${index}`);

        // ポイントに値があればポイントの値に変更
        if (point) {
            passData[index][1] = parseInt(point);
        } else {
            passData[index][1] = 'null';
        }
    }
    // グラフの描画
    drawGraph();
}

/**
 * @function 目標ポイント入力
 */
function inputTargetPoint() {
    // ポイント入力欄がある場合のみグラフの再描画処理を行う
    if ($('#pointInputs').css('display') !== 'none') {
        const targetPoint = document.getElementById("targetPoint").value;
        // ローカルストレージに保存
        localStorage.setItem('targetPoint', targetPoint);

        // グラフデータの配列を作成
        const period = dates.length;
        const dailyTarget = targetPoint / period;

        for (i=0; i<period; i++) {
            targetData[i][1] = Math.round(dailyTarget * (i + 1));
        }

        // グラフの描画
        drawGraph();
    }
}


/**
 * @function クリア処理
 */
function clearData() {
    // 関連するローカルストレージのキーのみ削除
    // ポイントとパスのデータ削除
    dates.forEach((actualData, index) => {
        localStorage.removeItem(`point_${index}`);
        localStorage.removeItem(`pass_${index}`);
    });

    // 開始日、終了日、目標ポイントの削除
    localStorage.removeItem('startDate');
    localStorage.removeItem('endDate');
    localStorage.removeItem('targetPoint');

    // 入力欄とグラフをリセット
    $('#targetPoint').val('');
    $('#inputTable').empty();
    $('.point-inputs').hide();
    $('#chart').empty();
    $('.checkbox-section').hide();
    actualData = [];
    passData = [];
    targetData = [];
    initData = [];

    // 開始日・終了日をデフォルト値に設定
    setDefaultDates();
    // 開始日終了日非活性
    document.getElementById('startDate').disabled = false;
    document.getElementById('endDate').disabled = false;
    
    // 決定ボタンを表示する
    document.getElementById("decision").style.display = null;
    // クリアボタンを隠す
    document.getElementById("clear").style.display = 'none';
}


/**
 * @function 日付初期値設定
 */
function setDefaultDates() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    let start, end;

    if (day >= 1 && day <= 8) {
        const lastDayOfLastMonth = new Date(year, month, 0);
        start = formatDate(lastDayOfLastMonth, '-');
        end = formatDate(new Date(year, month, 8), '-');
    } else if (day >= 9 && day <= 23) {
        start = formatDate(new Date(year, month, 15), '-');
        end = formatDate(new Date(year, month, 23), '-');
    } else {
        const lastDayOfMonth = new Date(year, month + 1, 0);
        start = formatDate(lastDayOfMonth, '-');
        end = formatDate(new Date(year, month + 1, 8), '-');
    }
    $('#startDate').val(start);
    $('#endDate').val(end);
}

/**
 * @function 日付フォーマット
 * @param date 日付
 * @param format フォーマット(指定なしでm月d日)
 * @returns フォーマット日付
 */
function formatDate(date, format) {
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    let d = date.getDate();
    let formatDate;
    if (typeof format === 'undefined') {
        formatDate = m + '月' + d + '日';
    } else {
        m = ('00' + m ).slice(-2);
        d = ("00" + d).slice(-2);
        formatDate = y + format + m + format + d;
    }
    return formatDate;
}
