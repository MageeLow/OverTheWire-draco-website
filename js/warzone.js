var warzoneApp = angular.module("warzoneApp", ["ngRoute", "angularMoment"]);

function randomString(n) { //{{{
    var out = "";
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i=0; i < n; i++)
        out += chars.charAt(Math.floor(Math.random() * chars.length));

    return out;
}
//}}}

warzoneApp.config(['$routeProvider', function($routeProvider) { //{{{
    $routeProvider
	.when('/help', 		{ templateUrl : 'pages/help/index.html' })
	.when('/help/account', 	{ templateUrl : 'pages/help/account.html' })
	.when('/profile/:username', {
		templateUrl : 'pages/profile.html',
		controller  : 'profileController'
	})
	.when('/host/:host', {
		templateUrl : 'pages/hostpage.html',
		controller  : 'hostpageController'
	})
	.when('/stats', {
		templateUrl : 'pages/stats.html',
		controller  : 'statsController'
	})
	.when('/liveservers', {
		templateUrl : 'pages/liveservers.html',
		controller  : 'liveserversController'
	})
	.when('/liveclients', {
		templateUrl : 'pages/liveclients.html',
		controller  : 'liveclientsController'
	})
	.when('/liverouters', {
		templateUrl : 'pages/liverouters.html',
		controller  : 'liveroutersController'
	})
	.when('/overview', {
		templateUrl : 'pages/overview.html',
		controller  : 'overviewController'
	})
	.otherwise({ redirectTo: '/overview' });
}]);
//}}}
warzoneApp.controller("statsController", ["$scope", function($scope) { //{{{
    renderFullStats();
    renderTodayStats();
}]);
//}}}
warzoneApp.controller("registerController", ["$scope", "$location", "$http", function($scope, $location, $http) { //{{{
    $scope.accountTypes = ["client", "router"];
    $scope.account = {};
    $scope.account.type = "client";
    $scope.setAccountType = function(x) {
	$scope.account.type = x;
    };
    $scope.updateCSR = function() {
	var file = $("#selectCSRFile").get(0).files[0];
	var reader = new FileReader();

	reader.onload = function(e) {
	    var filecontent = reader.result;
	    if(filecontent.indexOf("-----BEGIN CERTIFICATE REQUEST-----") == 0) {
		$scope.account.csr = filecontent;
		$scope.error = "This file looks like a CSR";
	    } else {
		$scope.account.csr = "";
		$scope.error = "This file is not a CSR";
	    }
	    // since we're going through jQuery, we need to notify AngularJS that something changed while it wasn't looking
	    $scope.$apply();
	}

	reader.readAsText(file);  
    };
    // this is a dirty hack to trigger an update when a (new) file is selected. AngularJS doesn't support onChange for
    // inputs of type "file" yet, so using jQuery to register a handler
    $('#registrationModal').on('shown.bs.modal', function (e) {
	$("#selectCSRFile").change($scope.updateCSR);
    });
    $scope.register = function(x) { 
	    var token = randomString(32);
	    $http.post('/s/register', {
	    		"username": $scope.account.username, 
			"type": $scope.account.type, 
			"csr": $scope.account.csr,
			"CSRFToken": token,
			}, {headers: {'X-CSRF-Token': token}})
		.success(function(data) {
		    if(data.success) {
		        // wait until modal is closed before going elsewhere
			var username = $scope.account.username;
		        $('#registrationModal').on("hidden.bs.modal", function() {
			    console.log("Going to "+"/profile/" + username);
			    $location.path("/profile/" + username);
			    console.log("Done going to "+"/profile/" + username);
			    $scope.$apply();
			});
		        $('#registrationModal').modal("hide");
		    } else {
			$scope.error = data.msg;
		    }
		})
		.error(function(data) {
		    alert("error");
		})
    };
}]);
//}}}
warzoneApp.controller("profileController", ["$scope", "$routeParams", "$http", //{{{
	function($scope, $routeParams, $http) {
	    $http.get('/s/profile/' + $routeParams.username).
		success(function(data) {
		    data.tarball_url = "/s/tarball/"+data.name;
		    $scope.data = data;
		})
	}
]);
//}}}
warzoneApp.controller("retrieveUsernameController", ["$scope", "$http", //{{{
	function($scope, $http) {
	  $http.get('/s/whoami').
	    success(function(data) {
	      data.profile_url = "/#/profile/"+data.name;
	      $scope.user = data;
	    })
	}
]);
//}}}
warzoneApp.controller("hostpageController", ["$scope", "$routeParams", "$http", "$sce", //{{{
	function($scope, $routeParams, $http, $sce) {
	    $http.get('/s/host/' + $routeParams.host).
		success(function(data) {
		    $scope.data = data;
		    $scope.body = $sce.trustAsHtml(data.body);
		})
	}
]);
//}}}

var liveDataFunctionBuilder = function(type) { //{{{
    return function($scope, $http) {
	$http.get('/s/live/'+type).
	    success(function(data) {
		$scope.data = [];
		for(var i in data.items) {
		    $scope.data.push({"name": i, "lastChange": data.items[i].lastChange})
		}

		$scope.data.sort(function(a, b) {return b.lastChange - a.lastChange})
	    })
    }
} //}}}
warzoneApp.controller("liveserversController", ["$scope", "$http", //{{{
    liveDataFunctionBuilder("servers")
]);
//}}}
warzoneApp.controller("liveclientsController", ["$scope", "$http", //{{{
    liveDataFunctionBuilder("clients")
]);
//}}}
warzoneApp.controller("liveroutersController", ["$scope", "$http", //{{{
    liveDataFunctionBuilder("routers")
]);
//}}}
warzoneApp.controller("overviewController", ["$scope", "$http", "$interval", //{{{
	function($scope, $http, $interval) {
 	    var getOnce = function() {
		$http.get('/s/statistics/latest.json').
		    success(function(data) {
			$scope.stats = data["stats"];
		    })
	    }
	    var intervalPromise = $interval(getOnce, 60000);      
	    getOnce();
	    $scope.$on('$destroy', function () { $interval.cancel(intervalPromise); });
	}
]);
//}}}
