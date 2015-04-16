if (typeof JiraHelper == 'undefined') {

    var JiraHelper = {};

    var jb = JiraHelper;

    JiraHelper.BurnDown = function () {

        this.SPRINTDATA_CACHE_KEY = "sprintData_";
        this.SPRINTDATA_GRAPH_CACHE_KEY = "sprintDataGraph_";
        this.URL_JIRA = document.location.origin;

        $.balloon.defaults.css = {
            "minWidth": "20px",
            "padding": "5px",
            "borderRadius": "6px",
            "border": "solid 1px #777",
            "boxShadow": "4px 4px 4px #555",
            "color": "#666",
            "backgroundColor": "#fff",
            "zIndex": "32767",
            "textAlign": "left"
        };

        this.queryString = function () {
            var query_string = {};
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (typeof query_string[pair[0]] === "undefined") {
                    query_string[pair[0]] = pair[1];
                } else if (typeof query_string[pair[0]] === "string") {
                    var arr = [query_string[pair[0]], pair[1]];
                    query_string[pair[0]] = arr;
                } else {
                    query_string[pair[0]].push(pair[1]);
                }
            }
            return query_string;
        }();

    };

    JiraHelper.BurnDown.prototype = {

        init: function () {

            var me = this;

            console.log("BurnDown Init");

            this.chartIsVisible = false;
            this.chartPieIsVisible = false;
            this.updating = false;

            //this.isMonitoring = false;
            this.sprintData = null;
            this.sprintDataGraph = null;

            if (this.validatePage()) {
                this.createBotton();
                this.createSprintData(function () {
                    me.createSprintDataGraph(function () {
                        me.createEventClick();
                    });
                });

            }

        },

        validatePage: function () {

            var me = this;

            var location = document.location;

            if (location.pathname != "/secure/RapidBoard.jspa" ||
                $("#ghx-work").html() == "" && me.queryString.rapidView) {
                return false;
            } else {
                return true;
            }


        },

        createBotton: function () {

            $("#create_link").after('<a id="burndown-toggle" class="aui-button aui-button-primary aui-style">BurnDown...</a>');
            $("#burndown-toggle").after('<a id="burndown-pie-toggle" class="aui-button aui-button-primary aui-style">Pie...</a>');
            $("#burndown-pie-toggle").after('<a id="burndown-update-toggle" class="aui-button aui-button-primary aui-style">Update</a>');
            

        },

        createSprintData: function (callback) {

            var me = this;

            me.sprintData = JiraHelper.Util.getValueFromLocalStorage(me.SPRINTDATA_CACHE_KEY + me.queryString.rapidView);

            if (me.sprintData) {
                callback();
                return;
            }

            var querieSprint = me.URL_JIRA + "/rest/greenhopper/1.0/xboard/work/allData.json?rapidViewId=" + me.queryString.rapidView;

            $.get(querieSprint, function (data) {

                var issues = data.issuesData.issues;

                var storiesData = [],
                    tasksData = [];

                for (var i in issues) {

                    var s = issues[i];

                    if (s.typeId == "7") { //Type Storie

                        storiesData.push({
                            id: s.id,
                            summary: s.summary,
                            done: s.done,
                            estimate: s.estimateStatistic.statFieldValue.value,
                            statusName: s.statusName,
                            subtasks: []

                        })

                    } else {

                        tasksData.push({
                            id: s.id,
                            summary: s.summary,
                            done: s.done,
                            statusName: s.statusName,
                            estimate: 0,
                            parentId: s.parentId,
                            created: null,
                            updated: null,
                            resolutiondate: null

                        })


                    }

                }

                me.sprintData = me.mergeSprintData(storiesData, tasksData, data.sprintsData.sprints[0]);
                JiraHelper.Util.saveValueToLocalStorage(me.SPRINTDATA_CACHE_KEY + me.queryString.rapidView, me.sprintData);

                callback();

            })

        },

        createSprintDataGraph: function (callback) {

            var me = this;
            var sprintData = me.sprintData;

            me.sprintDataGraph = JiraHelper.Util.getValueFromLocalStorage(me.SPRINTDATA_GRAPH_CACHE_KEY + me.queryString.rapidView);

            if (me.sprintDataGraph) {
                callback();
                return;
            }

            var totalDates = JiraHelper.Util.calculateDate(sprintData.startDate, sprintData.endDate);
            var initDate = new Date(sprintData.startDate);

            var categorieDate = [];
            categorieDate.push(JiraHelper.Util.convertDateString(initDate));

            var seriePointsDeal = {};
            seriePointsDeal.name = "Velocidade Ideal";
            seriePointsDeal.data = [];
            seriePointsDeal.data.push(sprintData.totalEstimate);

            var serieTasksDone = {};
            serieTasksDone.name = "Velocidade da Sprint";
            serieTasksDone.data = [];
            serieTasksDone.data.push(sprintData.totalEstimate);

            //For variables
            var pointsToDone = sprintData.totalEstimate;
            var pointsDone = sprintData.totalEstimate;
            var dayOfSpring = 10;

            for (var d = 1; d < totalDates; d++) {

                initDate = new Date(initDate.setDate(initDate.getDate() + 1));

                if (initDate.getDay() != 6 && initDate.getDay() != 0) {

                    categorieDate.push(JiraHelper.Util.convertDateString(initDate));

                    pointsDone -= me.findTasksDoneByDay(initDate);
                    serieTasksDone.data.push(pointsDone.toFixed(2) * 1);

                    dayOfSpring--;
                    pointsToDone = pointsToDone - (pointsToDone / dayOfSpring) || 0;
                    seriePointsDeal.data.push(pointsToDone.toFixed(2) * 1);

                }

            }

            var data = {};
            data.ploteLines = {};
            data.ploteLines.categories = categorieDate;
            data.ploteLines.series = [];
            data.ploteLines.series.push(seriePointsDeal);
            data.ploteLines.series.push(serieTasksDone);

            data.pieSeries = me.createPieSeries();

            me.sprintDataGraph = data;
            JiraHelper.Util.saveValueToLocalStorage(me.SPRINTDATA_GRAPH_CACHE_KEY + me.queryString.rapidView, data);

            callback();

        },

        createPieSeries: function () {

            var me = this;

            var resume = me.getResumeSprintPoints();

            var series = [{
                type: 'pie',
                name: 'Sprint Points',
                data: [
                    ['BackLog', (resume.pointsInBackLog / me.sprintData.totalEstimate) * 100],
                    ['In Progress', (resume.pointsInProgress / me.sprintData.totalEstimate) * 100],
                    ['Verify', (resume.pointsInVerify / me.sprintData.totalEstimate) * 100],
                    {
                        name: 'Done',
                        y: (resume.pointsInDone / me.sprintData.totalEstimate) * 100,
                        sliced: true,
                        selected: true
                    }

                ]
            }];

            return series;


        },

        mergeSprintData: function (storiesData, tasksData, sprintsData) {
            
            var me = this;

            var sprintData = {};
            sprintData.sprintName = sprintsData.name;
            sprintData.totalEstimate = 0;
            sprintData.estories = storiesData;
            sprintData.tasks = [];
            sprintData.startDate = new Date(Date.parse(sprintsData.startDate.split(" ")[0]));
            sprintData.endDate = new Date(Date.parse(sprintsData.endDate.split(" ")[0]));

            for (var i in storiesData) {

                for (var s in tasksData) {

                    if (tasksData[s].parentId == storiesData[i].id) {

                        $.ajax({
                            url: me.URL_JIRA + "/rest/api/2/issue/" + tasksData[s].id + "?fields=created,updated,parent,resolutiondate,customfield_10008,summary,status",
                            async: false,
                            success: function (data) {
                                if (data) {
                                    tasksData[s].created = data.fields.created;
                                    tasksData[s].updated = data.fields.updated;
                                    if (data.fields.resolutiondate) {
                                        tasksData[s].resolutiondate = data.fields.resolutiondate;
                                    }
                                }
                            }
                        });

                        storiesData[i].subtasks.push(tasksData[s]);
                        sprintData.tasks.push(tasksData[s])

                    }

                }

                sprintData.totalEstimate += storiesData[i].estimate || 0;

            }

            for (var i in storiesData) {

                var pointPerTask = storiesData[i].estimate / storiesData[i].subtasks.length;

                for (var s in storiesData[i].subtasks) {
                    storiesData[i].subtasks[s].estimate = pointPerTask;
                }

            }

            return sprintData;

            //created,updated,parent,resolutiondate,customfield_1   0008,summary,status

        },

        findTasksDoneByDay: function (initDate) {

            var me = this;

            var pointsDoneByDay = 0;

            for (var t in me.sprintData.tasks) {

                var sDateC = initDate.getDate() + "/" + initDate.getMonth();

                if (me.sprintData.tasks[t].resolutiondate) {

                    var rDate = new Date(me.sprintData.tasks[t].resolutiondate);
                    var sDateR = rDate.getDate() + "/" + rDate.getMonth();

                    if (sDateC == sDateR) {

                        pointsDoneByDay += me.sprintData.tasks[t].estimate;

                    }

                }

            }

            return pointsDoneByDay;

        },

        getResumeSprintPoints: function () {

            var me = this;

            var pointsInDone = 0;
            var pointsInProgress = 0;
            var pointsInVerify = 0;
            var pointsInBackLog = 0;

            for (var t in me.sprintData.tasks) {


                if (me.sprintData.tasks[t].statusName == "Done") {
                    pointsInDone += me.sprintData.tasks[t].estimate || 0;
                }

                if (me.sprintData.tasks[t].statusName == "Backlog") {
                    pointsInBackLog += me.sprintData.tasks[t].estimate || 0;
                }

                if (me.sprintData.tasks[t].statusName == "In Progress") {
                    pointsInProgress += me.sprintData.tasks[t].estimate || 0;
                }

                if (me.sprintData.tasks[t].statusName == "Verify") {
                    pointsInVerify += me.sprintData.tasks[t].estimate || 0;
                }

            }

            return {
                pointsInBackLog: pointsInBackLog.toFixed(2),
                pointsInProgress: pointsInProgress.toFixed(2),
                pointsInVerify: pointsInVerify.toFixed(2),
                pointsInDone: pointsInDone.toFixed(2)
            };

        },

        showGraphC3: function () {

            var me = this;

            var chart = c3.generate({
                data: {
                    x: 'x',
                    columns: me.sprintDataGraph
                },
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            format: '%d/%m'
                        }
                    }
                }
            });

        },

        showGraphHighChart: function () {

            var me = this;

            $("#chart").highcharts({
                title: {
                    text: 'Tasks BurnDown',
                    x: -20 //center
                },
                subtitle: {
                    text: 'Source: JIRA',
                    x: -20
                },
                xAxis: {
                    categories: me.sprintDataGraph.ploteLines.categories
                },
                yAxis: {
                    title: {
                        text: 'Points'
                    },
                    plotLines: [{
                        value: 0,
                        width: 1,
                        color: '#808080'
                    }]
                },
                plotOptions: {
                    line: {
                        dataLabels: {
                            enabled: true
                        },
                        enableMouseTracking: true
                    }
                },
                tooltip: {
                    valueSuffix: ' points'
                },
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom',
                    borderWidth: 0
                },
                series: me.sprintDataGraph.ploteLines.series

            });

        },

        showGraphHighChartPie: function () {

            var me = this;

            $("#chart_pie").highcharts({
                chart: {
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false
                },
                title: {
                    text: me.sprintData.sprintName
                },
                tooltip: {
                    pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                            style: {
                                color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                            }
                        }
                    }
                },
                series: me.sprintDataGraph.pieSeries
            });

        },

        createEventClick: function () {

            var me = this;

            $('#burndown-toggle').html("BurnDown");
            $('#burndown-toggle').click(function (e) {

                if (me.updating) return false;

                if (me.chartPieIsVisible) {
                    me.chartPieIsVisible = false;
                    $("#burndown-pie-toggle").hideBalloon();
                }

                if (me.chartIsVisible) {
                    me.chartIsVisible = false;
                    $(this).hideBalloon();
                } else {

                    var content = '<div id="chart_content"  style="position: relative;height: 400px;width: 600px;"><div id="chart">Carregando...</div><div><a id="burndown-update" href="javascript:updateBurnDown()">Atualizar</a></div>';

                    $(this).showBalloon({
                        position: "bottom",
                        contents: content,
                        className: "css_balloon"
                    });
                    me.showGraphHighChart();
                    me.chartIsVisible = true;
                }

                return false;
            });

            $('#burndown-pie-toggle').html("Pie");
            $('#burndown-pie-toggle').click(function (e) {

                if (me.updating) return false;

                if (me.chartIsVisible) {
                    me.chartIsVisible = false;
                    $("#burndown-toggle").hideBalloon();
                }

                if (me.chartPieIsVisible) {
                    me.chartPieIsVisible = false;
                    $(this).hideBalloon();
                } else {

                    var content = '<div id="chart_pie_content"  style="position: relative;height: 400px;width: 600px;"><div id="chart_pie">Carregando...</div>';
                    $(this).showBalloon({
                        position: "bottom",
                        contents: content,
                        className: "css_balloon"
                    });
                    me.showGraphHighChartPie();
                    me.chartPieIsVisible = true;
                }

                return false;
            });

            $("#burndown-update-toggle").click(function (e) {

                var meClick = this;

                me.updating = true;

                $(this).html("Update...");

                JiraHelper.Util.resetLocalStorage(me.SPRINTDATA_CACHE_KEY + me.queryString.rapidView);
                JiraHelper.Util.resetLocalStorage(me.SPRINTDATA_GRAPH_CACHE_KEY + me.queryString.rapidView);

                me.createSprintData(function () {
                    me.createSprintDataGraph(function () {
                        $(meClick).html("Update");
                        me.updating = false;
                    });
                });

                return false;

            });


        }

    }

    JiraHelper.Util = {

        calculateDate: function (date1, date2) {

            var d1 = new Date(date1);
            var d2 = new Date(date2);

            var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

            var diffDays = Math.round(Math.abs((d1.getTime() - d2.getTime()) / (oneDay)));

            return diffDays;

        },

        convertDateString: function (date) {

            var sMonth = date.getMonth() < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
            var sDate = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();

            return sDate + "/" + sMonth + "/" + date.getFullYear();

        },

        getValueFromLocalStorage: function (key) {
            var value = null;

            if (localStorage[key]) {
                value = JSON.parse(localStorage[key]);
            }

            return value;

        },

        saveValueToLocalStorage: function (key, data) {
            localStorage[key] = JSON.stringify(data);
        },

        resetLocalStorage: function (key) {

            localStorage[key] = null;

        },

        closeBalloons: function () {
            $(".baLinkBalloonActivated").removeClass("baLinkBalloonActivated").hideBalloon();
        },

    }

}

$(document).ready(function () {

    var jr = new JiraHelper.BurnDown();
    jr.init();


})