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

            this.chartStoriesIsVisible = false;
            this.chartPointsIsVisible = false;
            this.chartTasksIsVisible = false;
            this.chartPizzaIsVisible = false;

            this.updating = false;

            //this.isMonitoring = false;
            this.sprintData = null;
            this.sprintDataGraph = null;

            if (this.validatePage()) {
                this.createButton();
                this.createSprintData(function (err) {
                    if (err) {
                        console.log("Error:", err);
                        return;
                    }
                    me.createSprintDataGraph(function (err) {
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

        createButton: function () {
            var menuList = '<li>\
              <a class="aui-nav-link aui-dropdown2-trigger" id="jirahelper-section" aria-haspopup="true" aria-owns="jirahelper-section-content">Jira Helper</a>\
              <div id="jirahelper-section-content" class="aui-dropdown2 aui-style-default">\
                <div class="aui-dropdown2-section">\
                  <ul class="aui-list-truncate">\
                    <li><a id="jirahelper-stories-menu" class="request-portal" href="#">Stories</a></li>\
                    <li><a id="jirahelper-tasks-menu" class="request-portal" href="#">Tasks</a></li>\
                    <li><a id="jirahelper-points-menu" class="request-portal" href="#">Points</a></li>\
                    <li><a id="jirahelper-pizza-menu" class="request-portal" href="#">Pizza</a></li>\
                    <li><a id="jirahelper-update-menu" class="request-portal" href="#">Update</a></li>\
                  </ul>\
                </div>\
              </div>\
            </li>';

            $("#create-menu").before(menuList);
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

                if (!data.sprintsData || !data.sprintsData.sprints || data.sprintsData.sprints.length == 0) {
                    callback("Invalid Sprint Data");
                    return;
                }

                var issues = data.issuesData.issues;
                var status = data.columnsData.columns;

                var storiesData = [],
                    tasksData = [];

                for (var i in issues) {

                    var s = issues[i];

                    if (s.typeId != "5") { //Type Storie

                        storiesData.push({
                            id: s.id,
                            summary: s.summary,
                            done: s.done,
                            typeId: s.typeId,
                            statusName: s.statusName,
                            statusId: s.statusId,
                            estimate: s.estimateStatistic.statFieldValue.value,
                            parentId: s.parentId || null,
                            subtasks: [],
                            created: null,
                            updated: null,
                            resolutiondate: null

                        })

                    } else {

                        tasksData.push({
                            id: s.id,
                            summary: s.summary,
                            done: s.done,
                            typeId: s.typeId,
                            statusName: s.statusName,
                            statusId: s.statusId,
                            estimate: 0,
                            parentId: s.parentId,
                            subtasks: [],
                            created: null,
                            updated: null,
                            resolutiondate: null

                        })


                    }

                }

                me.sprintData = me.mergeSprintData(storiesData, tasksData, data);

                //Create Resume per Status
                me.createResumeStatus();

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

            //By Points
            var seriePoints = me.createSeriePoints(sprintData.totalEstimate);
            var seriePointsDeal = seriePoints.deal;
            var seriePointsDone = seriePoints.done;

            //By Tasks
            var serieTasks = me.createSerieTasks(sprintData.tasks.length)
            var serieTasksDeal = serieTasks.deal;
            var serieTasksDone = serieTasks.done;

            //By Stories
            var serieStories = me.createSerieStories(sprintData.totalEstimate);
            var serieStoriesDeal = serieStories.deal;
            var serieStoriesDone = serieStories.done;

            //For variables
            var _pointsDeal = sprintData.totalEstimate;
            var _pointsDone = sprintData.totalEstimate;

            var _tasksDone = sprintData.tasks.length;
            var _tasksDeal = sprintData.tasks.length;

            var _storiesDeal = sprintData.totalEstimate;
            var _storiesDone = sprintData.totalEstimate;

            var dayOfSpring = totalDates;

            for (var d = 1; d < totalDates; d++) {

                initDate = new Date(initDate.setDate(initDate.getDate() + 1));

                //if (initDate.getDay() != 6 && initDate.getDay() != 0) {

                categorieDate.push(JiraHelper.Util.convertDateString(initDate));

                dayOfSpring--;

                var resumeDone = me.findTasksDoneByDay(initDate)

                //By Points
                _pointsDone -= resumeDone.taskPoints || 0;
                seriePointsDone.data.push(_pointsDone.toFixed(2) * 1);

                _pointsDeal = _pointsDeal - (_pointsDeal / dayOfSpring) || 0;
                seriePointsDeal.data.push(_pointsDeal.toFixed(2) * 1);

                //By Tasks
                _tasksDone -= resumeDone.totalTasks || 0;
                serieTasksDone.data.push(_tasksDone.toFixed(2) * 1);

                _tasksDeal = _tasksDeal - (_tasksDeal / dayOfSpring) || 0;
                serieTasksDeal.data.push(Math.round(_tasksDeal));

                //By Storie
                _storiesDone -= resumeDone.storyPoints || 0;
                serieStoriesDone.data.push(_storiesDone.toFixed(2) * 1);

                _storiesDeal = _storiesDeal - (_storiesDeal / dayOfSpring) || 0;
                serieStoriesDeal.data.push(Math.round(_storiesDeal));

                //}

            }

            var data = {};
            data.ploteLines = {};
            data.ploteLines.categories = categorieDate;
            data.ploteLines.points = [];

            data.ploteLines.points.push(seriePointsDeal);
            data.ploteLines.points.push(seriePointsDone);

            data.ploteLines.tasks = [];

            data.ploteLines.tasks.push(serieTasksDeal);
            data.ploteLines.tasks.push(serieTasksDone);

            data.ploteLines.stories = [];
            data.ploteLines.stories.push(serieStoriesDeal);
            data.ploteLines.stories.push(serieStoriesDone);

            data.pieSeries = me.createPieSeries();

            me.sprintDataGraph = data;
            JiraHelper.Util.saveValueToLocalStorage(me.SPRINTDATA_GRAPH_CACHE_KEY + me.queryString.rapidView, data);

            callback();

        },

        createSeriePoints: function (estimate) {

            return {
                deal: {
                    name: "Velocidade Ideal - Points",
                    data: [estimate]
                },
                done: {
                    name: "Velocidade da Sprint - Points",
                    data: [estimate]
                }
            };

        },

        createSerieTasks: function (totalTasks) {

            return {
                deal: {
                    name: "Velocidade Ideal - Stories",
                    data: [totalTasks]
                },
                done: {
                    name: "Velocidade da Sprint - Stories",
                    data: [totalTasks]
                }
            };


        },

        createSerieStories: function (estimate) {

            return {
                deal: {
                    name: "Velocidade Ideal - Stories",
                    data: [estimate]
                },
                done: {
                    name: "Velocidade da Sprint - Stories",
                    data: [estimate]
                }
            };

        },



        createPieSeries: function () {

            var me = this;

            var resume = me.sprintData.resumePerStatus;

            var dataResume = [];

            for (var r in resume) {

                dataResume.push([
                resume[r].name, resume[r].percent
                ]);

            };

            var series = [{
                type: 'pie',
                data: dataResume
            }];

            return series;


        },

        createStatus: function (statusData) {

            var status = []

            for (var s in statusData) {

                status.push({
                    id: statusData[s].statusIds[0],
                    name: statusData[s].name
                });

            }

            return status;

        },

        mergeSprintData: function (storiesData, tasksData, data) {

            var me = this;
            var sprintsData = data.sprintsData.sprints[0];

            var sprintData = {};
            sprintData.sprintName = sprintsData.name;
            sprintData.totalEstimate = 0;
            sprintData.stories = storiesData;
            sprintData.tasks = [];
            sprintData.startDate = new Date(Date.parse(sprintsData.startDate.split(" ")[0]));
            sprintData.endDate = new Date(Date.parse(sprintsData.endDate.split(" ")[0]));
            sprintData.status = me.createStatus(data.columnsData.columns);

            for (var i in storiesData) {

                $.ajax({
                    url: me.URL_JIRA + "/rest/api/2/issue/" + storiesData[i].id + "?fields=created,updated,parent,resolutiondate,customfield_10008,summary,status",
                    async: false,
                    success: function (data) {
                        if (data) {
                            storiesData[i].created = data.fields.created;
                            storiesData[i].updated = data.fields.updated;
                            if (data.fields.resolutiondate) {
                                storiesData[i].resolutiondate = data.fields.resolutiondate;
                            }
                        }
                    }
                });

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
                        sprintData.tasks.push(tasksData[s]);

                    }

                }

                if (storiesData[i].subtasks.length == 0) {

                    var newTask = JiraHelper.Util.clone(storiesData[i]);
                    newTask.typeId = "5";
                    newTask.subtasks = [];
                    storiesData[i].subtasks.push(newTask);
                    sprintData.tasks.push(newTask);

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
            var storyPointDoneByDay = 0;
            var totalTasks = 0;
            var totalStories = 0;

            var paramDate = initDate.getDate() + "/" + initDate.getMonth();

            for (var t in me.sprintData.tasks) {

                var currentTask = me.sprintData.tasks[t];

                if (currentTask.resolutiondate) {

                    var convertDate = new Date(currentTask.resolutiondate);
                    var currentDate = convertDate.getDate() + "/" + convertDate.getMonth();

                    if (paramDate == currentDate) {

                        pointsDoneByDay += currentTask.estimate;
                        totalTasks++;

                    }

                }

            }

            for (var s in me.sprintData.stories) {

                var currentStory = me.sprintData.stories[s];

                if (currentStory.resolutiondate) {

                    var convertDate = new Date(currentStory.resolutiondate);
                    var currentDate = convertDate.getDate() + "/" + convertDate.getMonth();

                    if (paramDate == currentDate) {

                        storyPointDoneByDay += currentStory.estimate;
                        totalStories++;

                    }

                }

            }


            return {
                storyPoints: storyPointDoneByDay,
                taskPoints: pointsDoneByDay,
                totalStories: totalStories,
                totalTasks: totalTasks
            }

        },

        createResumeStatus: function () {

            var me = this;

            var estimateTotal = 0;

            var resumeStatus = [];

            for (var s in me.sprintData.status) {

                for (var t in me.sprintData.tasks) {

                    if (me.sprintData.tasks[t].statusId == me.sprintData.status[s].id) {
                        estimateTotal += me.sprintData.tasks[t].estimate || 0;
                    }

                }

                resumeStatus.push({
                    name: me.sprintData.status[s].name,
                    estimate: estimateTotal.toFixed(2),
                    percent: (estimateTotal.toFixed(2) / me.sprintData.totalEstimate) * 100

                });

                estimateTotal = 0;

            }

            me.sprintData.resumePerStatus = resumeStatus;

        },

        showGraphHighChartStories: function (elementName) {

            var me = this;

            $("#" + elementName).highcharts({
                title: {
                    text: 'Story BurnDown',
                    x: -20 //center
                },
                subtitle: {
                    text: 'Source: JIRA',
                    x: -20
                },
                xAxis: {
                    categories: me.sprintDataGraph.ploteLines.categories,
                    plotBands: [{
                        color: '#fffa84',
                        from: 0,
                        to: (JiraHelper.Util.calculateDate(me.sprintData.startDate, new Date()))
                    }]
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Story Points'
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
                series: me.sprintDataGraph.ploteLines.stories

            });

        },

        showGraphHighChartPoints: function (elementName) {

            var me = this;

            $("#" + elementName).highcharts({
                title: {
                    text: 'Points BurnDown',
                    x: -20 //center
                },
                subtitle: {
                    text: 'Source: JIRA',
                    x: -20
                },
                xAxis: {
                    categories: me.sprintDataGraph.ploteLines.categories,
                    plotBands: [{
                        color: '#fffa84',
                        from: 0,
                        to: (JiraHelper.Util.calculateDate(me.sprintData.startDate, new Date()))
                    }]
                },
                yAxis: {
                    min: 0,
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
                series: me.sprintDataGraph.ploteLines.points

            });

        },

        showGraphHighChartTasks: function (elementName) {

            var me = this;

            $("#" + elementName).highcharts({
                title: {
                    text: 'Tasks BurnDown',
                    x: -20 //center
                },
                subtitle: {
                    text: 'Source: JIRA',
                    x: -20
                },
                xAxis: {
                    categories: me.sprintDataGraph.ploteLines.categories,
                    plotBands: [{
                        color: '#fffa84',
                        from: 0,
                        to: (JiraHelper.Util.calculateDate(me.sprintData.startDate, new Date()))
                    }]
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Tasks'
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
                    valueSuffix: ' tasks'
                },
                legend: {
                    layout: 'horizontal',
                    align: 'center',
                    verticalAlign: 'bottom',
                    borderWidth: 0
                },
                series: me.sprintDataGraph.ploteLines.tasks

            });

        },

        showGraphHighChartPizza: function (elementName) {

            var me = this;

            $("#" + elementName).highcharts({
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

            this.createEventClickStories();

            this.createEventClickPoints();

            this.createEventClickTasks();

            this.createEventClickPizza();

            this.createEventClickUpdate();

        },

        createEventClickStories: function () {

            var me = this;

            $('#jirahelper-stories-menu').click(function (e) {

                if (me.updating) return false;

                if (me.chartStoriesIsVisible) {
                    me.hideAllCharts();
                    return false;
                } else {
                    me.hideAllCharts();
                    var content = '<div id="chart_stories_content"  style="position: relative;height: 400px;width: 600px;"><div id="chart_stories">Carregando...</div>';

                    $(this).showBalloon({
                        position: "bottom",
                        contents: content,
                        className: "css_balloon"
                    });
                    me.showGraphHighChartStories("chart_stories");
                    me.chartStoriesIsVisible = true;


                    return false;

                }
            });

        },

        createEventClickPoints: function () {

            var me = this;

            $('#jirahelper-tasks-menu').click(function (e) {

                if (me.updating) return false;

                if (me.chartPointsIsVisible) {
                    me.hideAllCharts();
                    return false;
                } else {
                    me.hideAllCharts();
                    var content = '<div id="chart_points_content"  style="position: relative;height: 400px;width: 600px;"><div id="chart_points">Carregando...</div>';

                    $(this).showBalloon({
                        position: "bottom",
                        contents: content,
                        className: "css_balloon"
                    });
                    me.showGraphHighChartPoints("chart_points");
                    me.chartPointsIsVisible = true;


                    return false;

                }
            });

        },

        createEventClickTasks: function () {

            var me = this;

            $('#jirahelper-points-menu').click(function (e) {

                if (me.updating) return false;

                if (me.chartTasksIsVisible) {
                    me.hideAllCharts();
                    return false;
                } else {
                    me.hideAllCharts();
                    var content = '<div id="chart_tasks_content"  style="position: relative;height: 400px;width: 600px;"><div id="chart_tasks">Carregando...</div>';
                    $(this).showBalloon({
                        position: "bottom",
                        contents: content,
                        className: "css_balloon"
                    });

                    me.showGraphHighChartTasks("chart_tasks");
                    me.chartTasksIsVisible = true;


                    return false;

                }

            });

        },


        createEventClickPizza: function () {

            var me = this;

            $('#jirahelper-pizza-menu').click(function (e) {

                if (me.updating) return false;

                if (me.chartPizzaIsVisible) {
                    me.hideAllCharts();
                    return false;
                } else {

                    me.hideAllCharts();

                    var content = '<div id="chart_pizza_content"  style="position: relative;height: 400px;width: 600px;"><div id="chart_pizza">Carregando...</div>';
                    $(this).showBalloon({
                        position: "bottom",
                        contents: content,
                        className: "css_balloon"
                    });

                    me.showGraphHighChartPizza("chart_pizza");
                    me.chartPizzaIsVisible = true;

                    return false;

                }
            });

        },


        createEventClickUpdate: function () {

            var me = this;

            $("#jirahelper-update-menu").click(function (e) {

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

        },

        hideAllCharts: function () {

            var me = this;

            me.chartStoriesIsVisible = false;
            me.chartPizzaIsVisible = false;
            me.chartPointsIsVisible = false;
            me.chartTasksIsVisible = false;

            $('#jirahelper-stories-menu').hideBalloon();
            $('#jirahelper-tasks-menu').hideBalloon();
            $('#jirahelper-points-menu').hideBalloon();
            $('#jirahelper-pizza-menu').hideBalloon();

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

        clone: function (obj) {
            if (null == obj || "object" != typeof obj) return obj;
            var copy = obj.constructor();
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
            }
            return copy;
        }

    }

}

$(document).ready(function () {

    var jr = new JiraHelper.BurnDown();
    jr.init();


})