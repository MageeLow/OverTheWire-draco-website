var warzoneApp = angular.module("warzoneApp", ["ngRoute", "angularMoment"]);

warzoneApp.filter('capitalizeFirst', function() {
    return function(input, scope) {
        return input.substring(0,1).toUpperCase()+input.substring(1);
    }
});

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
	.when('/help/overview', { templateUrl : 'pages/help/overview.html' })
	.when('/help/register', { templateUrl : 'pages/help/register.html' })
	.when('/help/configure-browser', { templateUrl : 'pages/help/configure-browser.html' })
	.when('/help/configure-openvpn', { templateUrl : 'pages/help/configure-openvpn.html' })
	.when('/help/connecting-vulnhosts', { templateUrl : 'pages/help/connecting-vulnhosts.html' })
	.when('/profile/:username', {
		templateUrl : 'pages/profile.html',
		controller  : 'profileController'
	})
	.when('/keys', {
		templateUrl : 'pages/keys.html',
		controller  : 'KeysController'
	})
	.when('/roles', {
		templateUrl : 'pages/roles.html',
		controller  : 'RolesController'
	})
	.otherwise({ redirectTo: '/overview' });
}]);
//}}}
warzoneApp.controller("profileController", ["$scope", "$routeParams", "$http", //{{{
	function($scope, $routeParams, $http) {
	    $http.get('/s/profile/' + $routeParams.username).
		success(function(data) {
		    data.cert_url = "/s/cert/"+data.name;
		    $scope.data = data;
		})
	}
]);
//}}}
warzoneApp.controller("retrieveUsernameController", ["$scope", "$http", "$window", "$location", //{{{
	function($scope, $http, $window, $location) {
	  $window.addEventListener('message', function(e) {
	      var username = e.data.username;
	      $('#registrationModal').on("hidden.bs.modal", function() {
                            $location.path("/profile/" + username);
                            $scope.$apply();
                        });
	      $('#registrationModal').modal("hide");
	  });
	  $http.get('/s/whoami').
	    success(function(data) {
	      data.profile_url = "/#/profile/"+data.name;
	      $scope.user = data;
	    })
	}
]);
//}}}

warzoneApp.controller("KeysController", ["$scope", "$http", "$window", "$location", //{{{
	function($scope, $http, $window, $location) {
	  $scope.data = {
	      "roles": {},
	      "keys": {}
	  };
	  $http.get('/s/keys').
	    success(function(data) {
	      $scope.data["keys"] = data;
	      $http.get('/s/roles/get').
		success(function(data) {
		  $scope.data["roles"] = data["roles"];
	      })
	  });
	  $scope.deleteKey = function(keyname) { 
	      var token = randomString(32);
	      $http.post('/s/deletekey', {
			  "name": keyname, 
			  "CSRFToken": token,
			  }, {headers: {'X-CSRF-Token': token}})
		  .success(function(data) {
		      if(data.success) {
			  delete $scope.data["keys"][keyname];
		      }
		  })
		  .error(function(data) {
		      alert("error");
		  })
	  };
	  $scope.updateKey = function(keyname, role) { 
	      var token = randomString(32);
	      $http.post('/s/updatekey', {
			  "name": keyname, 
			  "role": role, 
			  "CSRFToken": token,
			  }, {headers: {'X-CSRF-Token': token}})
		  .success(function(data) {
		      if(data.success) {
			  //$scope.data["keys"][keyname] = role;
		      }
		  })
		  .error(function(data) {
		      alert("error");
		  })
	  };
	}
]);
//}}}
warzoneApp.controller("AddKeyController", ["$scope", "$http", "$window", "$location", //{{{
  function($scope, $http, $window, $location) {
    $scope.isValidKeyName = function(n) {
      return true; // FIXME
    };
    $scope.setAlert = function(t, m) {
        if(t == "") {
	    delete $scope.alerttype;
	    delete $scope.alertmsg;
	} else {
	    $scope.alerttype = "alert-" + t;
	    $scope.alertmsg = m;
	}
    };
    $scope.setAlert("","");
    $scope.updateSPKAC = function() {
	var file = $("#selectSPKACFile").get(0).files[0];
	var reader = new FileReader();

	reader.onload = function(e) {
	    var filecontent = reader.result;
	    if(filecontent.indexOf("SPKAC=") == 0) {
		$scope.spkac = filecontent;
		$scope.setAlert("success", "This file looks like a SPKAC");
	    } else {
		$scope.spkac = "";
		$scope.setAlert("danger", "This file is not a SPKAC");
	    }
	    // since we're going through jQuery, we need to notify AngularJS that something changed while it wasn't looking
	    $scope.$apply();
	}

	reader.readAsText(file);  
    };
    // this is a dirty hack to trigger an update when a (new) file is selected. AngularJS doesn't support onChange for
    // inputs of type "file" yet, so using jQuery to register a handler
    $('#addKeyModal').on('shown.bs.modal', function (e) {
	$("#selectSPKACFile").change($scope.updateSPKAC);
    });
    $scope.addKey = function() { 
	    var token = randomString(32);
	    // FIXME: invalid key name
	    $http.post('/s/addkey', {
	    		"name": $scope.subkeyname, 
			"role": $scope.subkeyrole, 
			"spkac": $scope.spkac,
			"CSRFToken": token,
			}, {headers: {'X-CSRF-Token': token}})
		.success(function(data) {
		    if(data.success) {
		        $('#addKeyModal').modal("hide");
			$http.get('/s/keys').
			  success(function(data) {
			    $scope.data["keys"] = data;
			    $http.get('/s/roles/get').
			      success(function(data) {
				$scope.data["roles"] = data["roles"];
			    })
			});
		    } else {
			$scope.setAlert("danger", data.msg);;
		    }
		})
		.error(function(data) {
		    alert("error");
		})
    };
}]);
//}}}
warzoneApp.controller("RolesController", ["$scope", "$http", "$window", "$location", //{{{
	function($scope, $http, $window, $location) {
	  $scope.addingRole = false;
	  $scope.isValidRoleName = function(n) {
	    return true; // FIXME
	  };
	  $scope.roleExists = function(r) {
	      return !$scope.addingRole && "data" in $scope && "roles" in $scope.data && r in $scope.data["roles"];
	  };
	  $scope.setAlert = function(t, m) {
	      if(t == "") {
		  delete $scope.alerttype;
		  delete $scope.alertmsg;
	      } else {
		  $scope.alerttype = "alert-" + t;
		  $scope.alertmsg = m;
	      }
	  };
	  $scope.setAlert("","");
	  $scope.getResourceList = function() {
	      var out = {};
	      for(var cat in $scope.data.resources) {
		  for(var r in $scope.data.resources[cat]) {
		      out[r] = cat;
		  }
	      }
	      return out;
	  };
	  $scope.getActionList = function(r) {
	      var rdict = $scope.getResourceList();
	      if(!(r in rdict)) [];
	      var cat = rdict[r];
	      return $scope.data.actions[cat];
	  };
	  $scope.revokePermission = function(role,category,resource,permission) {
	      delete $scope.data["roles"][role][category][resource][permission];
	  };
	  $scope.addPermission = function(role,resource,permission) {
	      var rdict = $scope.getResourceList();
	      if(!(resource in rdict)) return;

	      var category = rdict[resource];
	      var x = $scope.data;

	      if(!("roles" in x)) { x["roles"] = {}; }
	      x = x["roles"];
	      if(!(role in x)) { x[role] = {}; }
	      x = x[role];
	      if(!(category in x)) { x[category] = {}; }
	      x = x[category];
	      if(!(resource in x)) { x[resource] = {}; }
	      x = x[resource];

	      x[permission] = 1
	  };
	  $scope.addOrUpdateRole = function(cmd, name) { 
		  var token = randomString(32);
		  if(cmd == 'add') {
		    // FIXME invalid role name
		    if(name in $scope.data["roles"]) {
		      return;
		    } else {
		      $scope.addingRole = true;
		      $scope.data["roles"][name] = {};
		    }
		  }
		  $http.post('/s/roles/'+cmd, {
			      "name": name,
			      "permissions": $scope.data["roles"][name], 
			      "CSRFToken": token,
			      }, {headers: {'X-CSRF-Token': token}})
		      .success(function(data) {
			  if(data.success) {
			    $('#addRoleModal').modal("hide");
			  } else {
			      if(cmd == 'add') {
				delete $scope.data["roles"][name];
			      }
			      $scope.setAlert("danger", data.msg);;
			  }
			  $scope.addingRole = false;
		      })
		      .error(function(data) {
			  alert("error");
		      })
	  };
	  $scope.deleteRole = function(name) { 
		  var token = randomString(32);
		  $http.post('/s/roles/delete', {
			      "name": name,
			      "CSRFToken": token,
			      }, {headers: {'X-CSRF-Token': token}})
		      .success(function(data) {
			  if(data.success) {
			      delete $scope.data["roles"][name];
			  } else {
			      $scope.setAlert("danger", data.msg);;
			  }
		      })
		      .error(function(data) {
			  alert("error");
		      })
	  };
	  $http.get('/s/roles/get').
	    success(function(data) {
	      $scope.data = data;
	  });
	}
]);
//}}}
