// public/core.js
var scotchTodo = angular.module('scotchTodo', ['ng', 'satellizer', 'trello-api-client', 'ngMaterial', 'ngMessages', 'darthwade.dwLoading'])

.config(function(TrelloClientProvider){
  TrelloClientProvider.init({
    key: '<YOUR TRELLO KEY HERE>',
    appName: 'Trello BurnDown Pedroks',
    tokenExpiration: 'never',
    scope: ['read', 'write', 'account'],
  });
})

// Directive for generic chart, pass in chart options
.directive('hcChart', function () {
    return {
        restrict: 'E',
        template: "",
        scope: {
            options: '='
        },
        link: function (scope, element) {
            var chart = Highcharts.chart(element[0], scope.options);

            scope.$watch('options', function (newOptions, oldOptions) {
              chart.setTitle(newOptions.title.text, newOptions.subtitle.text, false);
              
              chart.series[0].setData(newOptions.series[0].data, false);
              if(newOptions.chart.type === undefined){
                chart.xAxis[0].setCategories(newOptions.xAxis.categories, false);
                chart.series[1].setData(newOptions.series[1].data, false);  
              }
              
              chart.redraw();
            }, true);
        }
    };
})

.controller('mainController', function($scope, $http, TrelloClient, $loading, $filter){
    $scope.popupOptions = {
      type: 'popup'
    };

    $loading.finish('burn');

    $scope.authenticate = TrelloClient.authenticate;

    $scope.startDate = null;
    $scope.endDate = null;
    $scope.hoursByDay = null;

    $scope.showPieChart = false;

    var gotParams = function(){
      return ($scope.startDate !== null && $scope.endDate !== null, $scope.hoursByDay !== null && $scope.focusBoardId !== null);
    };

    $scope.getMyBoards = function(){
        TrelloClient.get('/members/me/boards').then(function(response){
          if(response.status === 200){
            $scope.boardsList = response.data;
          }
        });
    };

    var saveNewData = function(){
      $http.post('/api/prefs', {boardId : $scope.focusBoardId, startDate: moment($scope.startDate).format('YYYY-M-D'), endDate: moment($scope.endDate).format('YYYY-M-D'), hoursByDay: $scope.hoursByDay})
            .success(function(data) {
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    var loadSavedData = function(boardId, boardName){
      $http.get('/api/prefs/' + boardId)
            .success(function(data) {
                if(data !== null){
                  $scope.startDate = moment(data.startDate).toDate();
                  $scope.endDate = moment(data.endDate).toDate();
                  $scope.hoursByDay = parseInt(data.hoursByDay);

                  loadBurndownForBoard(boardId, boardName);  
                } else {
                  $scope.startDate = null;
                  $scope.endDate = null;
                  $scope.hoursByDay = null;  

                  clearCharts();
                  $loading.finish('burn');
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    $scope.loadBurndown = function(boardId, boardName){
      // Lock UI and show spinner
      $loading.start('burn');
      
      $scope.focusBoardId = boardId;

      $scope.cardsList = [];
      $scope.listId = null;

      loadSavedData(boardId, boardName);  

    };

    var loadBurndownForBoard = function(boardId, boardName){
      TrelloClient.get('/boards/'+boardId+'/lists').then(function(response){
          if(response.status === 200){
            $scope.boardId = boardId;
            angular.forEach(response.data, function(value, key) {
              if(value.name.toLowerCase() == 'done'){
                $scope.listId = value.id;
              }
            });
          }
        }).then(function(response){
            TrelloClient.get('/lists/'+$scope.listId+'/cards?fields=name&members=true&member_fields=fullName&actions=updateCard').then(function(response){
              if(response.status === 200){
                $scope.cardsList = response.data;
                $scope.calculateHoursDone(boardName);
              }
              // Unlock UI and hide spinner
              $loading.finish('burn');
            });  
        });  
    };    

    $scope.calculateHoursDone = function(boardName){
      
      if(!$scope.cardsList){
        return;
      } else {
        if(gotParams()){
          saveNewData();  
        } else {
          return;
        }
      }

      var startDate = moment($scope.startDate);
      var endDate = moment($scope.endDate);     
      var sprintHoursByDay = [];
      var membersPerHour = {'total' : 0}  ;

      angular.forEach($scope.cardsList, function(value, key) {
        
        var cardDate = moment(value.actions[0].date.substring(0,10));                
        var taskHour = value.name.match(/\(\D*(\d+)\D*?\)/) ? parseInt(value.name.match(/\(\D*(\d+)\D*?\)/)[1]) : 0;
        countHoursPerMember(membersPerHour, value.members[0] ? value.members[0].fullName : 'Nobody', taskHour);

        if(cardDate.isSameOrAfter(startDate) && cardDate.isSameOrBefore(endDate)){
          var diff = cardDate.diff(startDate, 'days');
          sprintHoursByDay[diff] = (sprintHoursByDay[diff] ? sprintHoursByDay[diff] : 0) + taskHour; 
        }
      });
      
      var categories = generateXAxisCategories();
      var idealBurn = generateIdealBurn();
      var sprintBurn = generateSprintBurn(sprintHoursByDay);
      var sprintBurnSpliced = spliceFutureDays(sprintBurn);
      changeChartValues(boardName, categories, idealBurn, sprintBurnSpliced);

      var pieChartMemberSeries = createPieChartMemberSeries(membersPerHour);
      changePieChartValues(pieChartMemberSeries);
    };

    var generateIdealBurn = function(){
      var startDate = moment($scope.startDate);
      var endDate = moment($scope.endDate);
      var hoursByDay = $scope.hoursByDay;
      var diff = endDate.diff(startDate, 'days');
      var totalDiff = getTotalHoursSprint();
      var idealBurn = [];

      for(var i = 0; i <= diff; i = i + 1){
        idealBurn[i] = totalDiff;
        startDate.add(1, 'day');
        if(!isWeekend(startDate)){
          totalDiff = totalDiff - hoursByDay;
        }
      }

      return idealBurn;
    };

    var generateSprintBurn = function(sprintHoursByDay){
      var startDate = moment($scope.startDate);
      var endDate = moment($scope.endDate);
      var diff = endDate.diff(startDate, 'days');
      var sprintTotalTime = getTotalHoursSprint();
      var totalHoursMade = 0;
      var sprintBurn = [];

      for(var i = 0; i <= diff; i = i + 1){
        totalHoursMade = totalHoursMade + (sprintHoursByDay[i] ? sprintHoursByDay[i] : 0);
        sprintBurn[i] = sprintTotalTime - totalHoursMade;
      }

      return sprintBurn;
    };

    var generateXAxisCategories = function(){
      var startDate = moment($scope.startDate);
      var endDate = moment($scope.endDate);
      var diff = endDate.diff(startDate, 'days');
      
      var categories = [];

      for(var i = 0; i <= diff; i = i + 1){
        categories[i] = startDate.format("D/M/YYYY");
        startDate.add(1,'day');
      }

      return categories;
    };

    function isWeekend(date){
      return (date.isoWeekday() == 6 || date.isoWeekday() == 7);
    }

    function getTotalHoursSprint() {
      var startDate = moment($scope.startDate);
      var endDate = moment($scope.endDate); 
      var businessDays = 0;
       while(!startDate.isSame(endDate)){
          if(!isWeekend(startDate)){
            businessDays = businessDays + 1;
          }
          startDate.add(1, 'day');
       }
       return businessDays * $scope.hoursByDay;
    }

    var changeChartValues = function (boardName, categories, idealBurn, sprintBurn){
       $scope.chartOptions.subtitle.text = boardName;
       $scope.chartOptions.xAxis.categories = categories;
       $scope.chartOptions.series[0].data = idealBurn;
       $scope.chartOptions.series[1].data = sprintBurn;
    };

    $scope.adjustWeekends = function(){
      $scope.showWeekends = !$scope.showWeekends;

      if($scope.showWeekends){
        var categories = $scope.chartOptions.xAxis.categories;
        var idealBurn = $scope.chartOptions.series[0].data;
        var sprintBurn = $scope.chartOptions.series[1].data;

        var startDate = moment($scope.startDate);
        var endDate = moment($scope.endDate);
        var position = 0;
      
        while(!startDate.isSame(endDate)){
          if(isWeekend(startDate)){
            categories.splice(position, 1);
            idealBurn.splice(position, 1);
            sprintBurn.splice(position, 1);
          } else {
            position = position + 1;  
          }
          startDate.add(1, 'day');
          
       }
      
       changeChartValues('', categories, idealBurn, sprintBurn);
      } else {
        $scope.calculateHoursDone();  
      }
    };

    var spliceFutureDays = function (array){
      var startDate = moment($scope.startDate);
      var today = moment();
      var diff = today.diff(startDate, 'days') + 1;
      if(diff > 0 && diff < array.length){
        array.splice(diff, array.length - diff);
      }
      return array;
    };

    var clearChartValues = function (){
       $scope.chartOptions.xAxis.categories = [];
       $scope.chartOptions.series[0].data = [200, 200, 200];
       $scope.chartOptions.series[1].data = [100, 100, 100];
    };

    var countHoursPerMember = function(map, memberFullName, taskHour){
      if(map[memberFullName] !== undefined){
        map[memberFullName] = map[memberFullName] + taskHour;
        map.total = map.total + taskHour;
      } else {
        map[memberFullName] = taskHour;
      }
    };

    var createPieChartMemberSeries = function(map){
      var totalHours = map.total;
      delete map.total;
      var pieChartMemberSeries = [];

      for (var key in map) {
        if (map.hasOwnProperty(key)) {
          var percentage = (map[key] * 100) / totalHours;
          pieChartMemberSeries.push({name: key, y: percentage, hours: map[key]});  
        }
      }

      return pieChartMemberSeries;
    };

    var changePieChartValues = function (pieChartMemberSeries){
       $scope.pieChartOptions.series[0].data = pieChartMemberSeries;
    };

    var clearPieChartValues = function (){
       $scope.pieChartOptions.series[0].data = [{
            name: 'Made',
            colorByPoint: true,
            data: [{
                name: 'None',
                y: 100,
                hours: 0
            }]
        }];
    };

    var clearCharts = function(){
      clearChartValues();
      clearPieChartValues();
    };

    $scope.getMyBoards();

    // Sample options for first chart
    $scope.chartOptions = {
      title: {
        text: 'Burndown Chart',
        x: -20 //center
      },
      colors: ['blue', 'red'],
      plotOptions: {
        line: {
          lineWidth: 3
        },
        tooltip: {
          hideDelay: 200
        }
      },
      subtitle: {
        text: '',
        x: -20
      },
      xAxis: {
        categories: []
      },
      yAxis: {
        title: {
          text: 'Hours'
        },
        plotLines: [{
          value: 0,
          width: 1
        }]
      },
      tooltip: {
        valueSuffix: ' hrs',
        crosshairs: true,
        shared: true
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'middle',
        borderWidth: 0
      },
      series: [{
        name: 'Ideal Burn',
        color: 'rgba(255,0,0,0.25)',
        lineWidth: 2,
        data: [100,100,100]
      }, {
        name: 'Actual Burn',
        color: 'rgba(0,120,200,0.75)',
        marker: {
          radius: 6
        },
        data: [200,200,200]
      }],
      chart: {
        
      }
    };

    $scope.pieChartOptions = {
        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false,
            type: 'pie'
        },
        title: {
            text: 'Developers X Hours'
        },
        subtitle: {
            text: '',
            x: -20
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.percentage:.1f}% of total hrs</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.hours} hrs',
                    style: {
                        color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                    }
                }
            }
        },
        series: [{
            name: 'Made',
            colorByPoint: true,
            data: [{
                name: 'None',
                y: 100,
                hours: 0
            }]
        }]
    };
});