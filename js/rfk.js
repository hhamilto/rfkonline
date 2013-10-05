$(function() {

	Parse.$ = jQuery;

	// Initialize Parse with your Parse application javascript keys
	Parse.initialize("5vJjW6VAiJdfBqyIEGgenZEip26b2NC5aZdVrC9A",
					 "cZbPecnNrzpf6NQkbwR09akfcZsfbH19Ps5hUBgf");
    //Models
    var Mentor = Parse.Object.extend("Mentor", {
        // Default attributes for the todo.
        defaults: {
          content: "Mentor not loaded...",
        },
        // Ensure that each todo created has `content`.
        initialize: function() {
          if (!this.get("content")) {
            this.set({"content": this.defaults.content});
          }
		  
        }
    });
	
	var Visit = Parse.Object.extend("Visit", {
        // Default attributes for the todo.
        defaults: {
          content: "Visit not loaded...",
        },
        // Ensure that each todo created has `content`.
        initialize: function() {
          if (!this.get("content")) {
            this.set({"content": this.defaults.content});
          }
        }
    });
    
    //Collections
    var MentorList = Parse.Collection.extend({
        // Reference to this collection's model.
        model: Mentor,
		/*initialize: function(){
			var data = this.get("Visits");
			this.unset("books", {silent: true});
			this.books = new Books(data);
		}*/
    });
	
	var VisitList = Parse.Collection.extend({
        // Reference to this collection's model.
        model: Visit
	});
    
    //Views
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
					$("#inputEmail").shake(2, 5, 300);
					$("#inputPassword").shake(2, 5, 300);
					$("#inputEmail").popover('show');
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
		events: {
			"click #signoutButton" : "logout"
		},
		el: ".content",
		initialize: function(){
			_.bindAll(this, "logout");
			this.render();
		},
		logout: function() {
			Parse.User.logOut();
			new LogInView();
			this.undelegateEvents();
			delete this;
		},
		render: function() {
			this.$el.html(_.template($("#dashboard-template").html()));
            new SidebarView();
            this.delegateEvents();
		}
	});
	
    var SidebarView = Parse.View.extend({
		el: "#sidebar",
		template: _.template($("#side-bar-template").html()),
		initialize: function(){
			var self = this;
			_.bindAll(this, 'addOne', 'addAll', 'render');
			
            this.$el.html(this.template({}));
			 // Create our collection of Mentors
			this.mentors = new MentorList;
			this.mentors.query = new Parse.Query(Mentor);
			
			this.mentors.bind('add',     this.addOne);
			this.mentors.bind('reset',   this.addAll);
			this.mentors.bind('all',     this.render);
			
			// Fetch all the todo items for this user
			this.mentors.fetch();
		},
		
		// Add a single mentor item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOne: function(mentor) {
			var view = new MentorListItemView({model: mentor});
			this.$("#mentor-list").append(view.render().el);
		},
		
		// Add all items in the Mentors collection at once.
		addAll: function(collection, filter) {
			this.$("#mentor-list").html("");
			this.mentors.each(this.addOne);
		},
		
		render: function() {
			//NO! bad. do not do this.
            //this.$el.html(this.template("yodummmy"));
			
			this.delegateEvents();
			console.log("done delegating events in render");
		}
	});
	
    var MentorListItemView = Parse.View.extend({
		element: 'li',
		template: _.template($('#mentor-item-template').html()),
		events: {
			"click li": "toggleVisits",
		},
		initialize: function(){
			this.$el.html(this.template(this.model.toJSON()));
			_.bindAll(this, 'addOne', 'addAll', 'render');
			this.model.bind('change', this.render);
			this.model.bind('destroy', this.remove);
			//whether the list of visits is displayed
			this.open = true;
			
			 // Create our collection of Visits
			this.visits = new VisitList;
			// Setup the query for the collection to look for todos from the current user
			this.visits.query = new Parse.Query(Visit);
			this.visits.query.equalTo("MentorId", this.model.attributes.UserId);
			
			this.visits.bind('add',     this.addOne);
			this.visits.bind('reset',   this.addAll);
			this.visits.bind('all',     this.render);
			
			// Fetch all the todo items for this user
			this.visits.fetch();
			//this.render
		},
		/*for the toggle down visits functionality*/
		toggleVisits: function(){
			this.open =!this.open;
			//this.$el.class("open", this.open);
		},
		
		// Add a single mentor item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOne: function(visit) {
			var view = new VisitListItemView({model: visit});
			this.$(".visit-list").append(view.render().el);
		},
		
		// Add all items in the Mentors collection at once.
		addAll: function(collection, filter) {
			this.$(".visit-list").html("");
			this.visits.each(this.addOne);
		},
		
		render: function(){
			
			//this.view2 = new View2();
			//this.$('insert-view-here').append(this.view2.render().el);
			
			//this.delegateEvents();
			return this;
		}
	});
	
    var VisitListItemView = Parse.View.extend({
		element: 'li',
		events: {
			"click li.visit" : "openVisit",
		},
		template: _.template($('#visit-item-template').html()),
		initialize: function(){
			this.render();
			_.bindAll(this, 'render');
			this.model.bind('change', this.render);
			this.model.bind('destroy', this.remove);
			//whether the list of visits is displayed
			this.open = false;
		},
		render: function(){
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		openVisit: function(e){fff
			console.log();
		}
	});
    
    var VisitView = Parse.View.extend({
		el: "#visit",
		initialize: function(){
			this.render();
		},
		render: function() {
            this.$el.html("main pane");
			//this.$el.html(_.template());	
		}
	});

    $("#inputEmail").popover();
	new MainView;
	//Main view is what is drawn on load
});





