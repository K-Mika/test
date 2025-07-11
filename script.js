$(document).ready(function() {
    initializeDates();
    loadSavedData();
});

function initializeDates() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    let startDate, endDate;

    // 開始日・終了日のロジック（クリア時にも再利用）
    function setDefaultDates() {
        if (day >= 1 && day <= 8) {
            const lastDayOfLastMonth = new Date(year, month, 0);
            startDate = formatDate(lastDayOfLastMonth);
            endDate = formatDate(new Date(year, month, 8));
        } else if (day >= 9 && day <= 23) {
            startDate = formatDate(new Date(year, month, 15));
            endDate = formatDate(new Date(year, month, 23));
        } else {
            const lastDayOfMonth = new Date(year, month + 1, 0);
            startDate = formatDate(lastDayOfMonth);
            endDate = formatDate(new Date(year, month + 1, 8));
        }
        return { startDate, endDate };
    }

    if (!localStorage.getItem('startDate') || !localStorage.getItem('endDate')) {
        const dates = setDefaultDates();
        $('#startDate').val(dates.startDate);
        $('#endDate').val(dates.endDate);
    } else {
        $('#startDate').val(localStorage.getItem('startDate'));
        $('#endDate').val(localStorage.getItem('endDate'));
        $('#targetPoints').val(localStorage.getItem('targetPoints') || '');
    }
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function loadSavedData() {
    if (localStorage.getItem('startDate') && localStorage.getItem('endDate')) {
        initializeGraph();
    }
}

function initializeGraph() {
    const startDate = new Date($('#startDate').val());
    const endDate = new Date($('#endDate').val());
    const targetPoints = parseInt($('#targetPoints').val()) || 0;

    if (!startDate || !endDate || isNaN(targetPoints)) {
        alert('開始日、終了日、目標ポイントを正しく入力してください。');
        return;
    }

    localStorage.setItem('startDate', $('#startDate').val());
    localStorage.setItem('endDate', $('#endDate').val());
    localStorage.setItem('targetPoints', targetPoints);

    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(formatDate(new Date(currentDate)));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const tbody = $('#inputTable');
    tbody.empty();
    dates.forEach(date => {
        const savedPoints = localStorage.getItem(`points_${date}`) || '';
        const savedPass = localStorage.getItem(`pass_${date}`) || '';
        tbody.append(`
            <tr>
                <td>${date}</td>
                <td><input type="number" class="point-input" data-date="${date}" value="${savedPoints}" min="0"></td>
                <td><input type="number" class="pass-input" data-date="${date}" value="${savedPass}" min="0"></td>
            </tr>
        `);
    });

    $('.point-inputs').show();
    drawGraph();

    $('.point-input, .pass-input').on('input', function() {
        const date = $(this).data('date');
        if ($(this).hasClass('point-input')) {
            localStorage.setItem(`points_${date}`, $(this).val());
        } else {
            localStorage.setItem(`pass_${date}`, $(this).val());
        }
        drawGraph();
    });

    $('#showActual, #showPass, #showTarget').on('change', drawGraph);
}

function drawGraph() {
    const startDate = new Date($('#startDate').val());
    const endDate = new Date($('#endDate').val());
    const targetPoints = parseInt($('#targetPoints').val()) || 0;
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(formatDate(new Date(currentDate)));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const days = dates.length;
    const dailyTarget = targetPoints / days;

    const actualData = [];
    const passData = [];
    const targetData = [];
    dates.forEach((date, index) => {
        const points = parseFloat(localStorage.getItem(`points_${date}`)) || null;
        const pass = parseFloat(localStorage.getItem(`pass_${date}`)) || 0;
        actualData.push([date, points]);
        passData.push([date, points !== null ? (points + pass) : null]);
        targetData.push([date, dailyTarget * (index + 1)]);
    });

    $('#chart').empty();
    const plotData = [];
    const series = [];

    if ($('#showActual').is(':checked')) {
        plotData.push(actualData);
        series.push({ label: '実際の値', color: '#ff6b81' });
    }
    if ($('#showPass').is(':checked')) {
        plotData.push(passData);
        series.push({ label: 'パス込み', color: '#6b7280', linePattern: 'dashed' });
    }
    if ($('#showTarget').is(':checked')) {
        plotData.push(targetData);
        series.push({ label: '目標値', color: '#60a5fa' });
    }

    if (plotData.length === 0) return;

    $.jqplot('chart', plotData, {
        title: 'イベントスコア進捗',
        axes: {
            xaxis: {
                renderer: $.jqplot.DateAxisRenderer,
                tickOptions: { formatString: '%Y-%m-%d' },
                min: startDate,
                max: endDate,
                tickInterval: '1 day'
            },
            yaxis: {
                label: 'ポイント',
                labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
                min: 0
            }
        },
        series: series,
        legend: {
            show: true,
            location: 'se',
            placement: 'inside'
        },
        highlighter: {
            show: true,
            tooltipAxes: 'xy',
            formatString: '<table class="jqplot-highlighter">' +
                '<tr><td>日付:</td><td>%s</td></tr>' +
                '<tr><td>実際の値:</td><td>%s</td></tr>' +
                '<tr><td>パス込み:</td><td>%s</td></tr>' +
                '<tr><td>目標値:</td><td>%s</td></tr>' +
                '<tr><td>実際-目標:</td><td style="color:%s">%s</td></tr>' +
                '<tr><td>パス込み-目標:</td><td style="color:%s">%s</td></tr></table>',
            tooltipContentEditor: function(str, seriesIndex, pointIndex, plot) {
                const date = plot.data[seriesIndex][pointIndex][0];
                const actual = actualData[pointIndex][1] !== null ? actualData[pointIndex][1] : 'N/A';
                const pass = passData[pointIndex][1] !== null ? passData[pointIndex][1] : 'N/A';
                const target = targetData[pointIndex][1];
                const diffActual = actual !== 'N/A' ? (actual - target).toFixed(2) : 'N/A';
                const diffPass = pass !== 'N/A' ? (pass - target).toFixed(2) : 'N/A';
                const colorActual = diffActual !== 'N/A' && diffActual < 0 ? 'red' : 'blue';
                const colorPass = diffPass !== 'N/A' && diffPass < 0 ? 'red' : 'blue';
                return '<table class="jqplot-highlighter">' +
                    `<tr><td>日付:</td><td>${date}</td></tr>` +
                    `<tr><td>実際の値:</td><td>${actual}</td></tr>` +
                    `<tr><td>パス込み:</td><td>${pass}</td></tr>` +
                    `<tr><td>目標値:</td><td>${target.toFixed(2)}</td></tr>` +
                    `<tr><td>実際-目標:</td><td style="color:${colorActual}">${diffActual}</td></tr>` +
                    `<tr><td>パス込み-目標:</td><td style="color:${colorPass}">${diffPass}</td></tr></table>`;
            }
        },
        cursor: { show: true }
    });
}

function clearData() {
    // 関連するローカルストレージのキーのみ削除
    const startDate = new Date($('#startDate').val());
    const endDate = new Date($('#endDate').val());
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(formatDate(new Date(currentDate)));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // ポイントとパスのデータ削除
    dates.forEach(date => {
        localStorage.removeItem(`points_${date}`);
        localStorage.removeItem(`pass_${date}`);
    });

    // 開始日、終了日、目標ポイントの削除
    localStorage.removeItem('startDate');
    localStorage.removeItem('endDate');
    localStorage.removeItem('targetPoints');

    // 入力欄とグラフをリセット
    $('#targetPoints').val('');
    $('#inputTable').empty();
    $('.point-inputs').hide();
    $('#chart').empty();
    $('#showActual').prop('checked', true);
    $('#showPass').prop('checked', true);
    $('#showTarget').prop('checked', true);

    // 開始日・終了日をデフォルト値に設定
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    let startDateVal, endDateVal;

    function setDefaultDates() {
        if (day >= 1 && day <= 8) {
            const lastDayOfLastMonth = new Date(year, month, 0);
            startDateVal = formatDate(lastDayOfLastMonth);
            endDateVal = formatDate(new Date(year, month, 8));
        } else if (day >= 9 && day <= 23) {
            startDateVal = formatDate(new Date(year, month, 15));
            endDateVal = formatDate(new Date(year, month, 23));
        } else {
            const lastDayOfMonth = new Date(year, month + 1, 0);
            startDateVal = formatDate(lastDayOfMonth);
            endDateVal = formatDate(new Date(year, month + 1, 8));
        }
        return { startDate: startDateVal, endDate: endDateVal };
    }

    const datesReset = setDefaultDates();
    $('#startDate').val(datesReset.startDate);
    $('#endDate').val(datesReset.endDate);
}
