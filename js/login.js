// An example Parse.js Backbone application based on the todo app by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses Parse to persist
// the todo items and provide user authentication and sessions.

$(function() {

	Parse.$ = jQuery;

	// Initialize Parse with your Parse application javascript keys
	Parse.initialize("5vJjW6VAiJdfBqyIEGgenZEip26b2NC5aZdVrC9A",
					 "cZbPecnNrzpf6NQkbwR09akfcZsfbH19Ps5hUBgf");

	 	// The main view for the app
  	var MainView = Parse.View.extend({
    	// Instead of generating a new element, bind to the existing skeleton of
    	// the App already present in the HTML.
    	el: $("#mainApp"),

		initialize: function() {
			this.render();
	    },

		render: function() {
			if (Parse.User.current()) {
		    	new DashboardView();
		    } else {
		        new LogInView();
		    }
		}
	});

	var FailureView = Parse.View.extend({

		el: ".content",

		initialize: function() {

			this.$el.html(_.template($("#failure-template").html()));
		},
	});

	var LogInView = Parse.View.extend({
		events: {
			"submit form.loginForm": "logIn"
		},

		el: ".content",
		
		initialize: function() {
			_.bindAll(this, "logIn");
			this.render();
		},

		logIn: function(e) {
			var self = this;
			var username = this.$("#inputEmail").val();
			var password = this.$("#inputPassword").val();
			
			Parse.User.logIn(username, password, {
				success: function(user) {
					new DashboardView();
					self.undelegateEvents(); //probably not needed
					delete self;
				},

				error: function(user, error) {
					new FailureView();
					self.undelegateEvents();
					delete self;
				}
			});

			return false;
		},

		render: function() {
			this.$el.html(_.template($("#login-template").html()));
			this.delegateEvents();
		}
	});

	var DashboardView = Parse.View.extend({

		el: ".content",

		initialize: function(){
			this.render();
		},

		render: function() {
			this.$el.html(_.template($("#dashboard-template").html()));	
		}

	});

	new MainView;
	//Main view is what is drawn on load
});
