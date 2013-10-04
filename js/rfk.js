$(function() {

	Parse.$ = jQuery;

	// Initialize Parse with your Parse application javascript keys
	Parse.initialize("5vJjW6VAiJdfBqyIEGgenZEip26b2NC5aZdVrC9A",
					 "cZbPecnNrzpf6NQkbwR09akfcZsfbH19Ps5hUBgf");
    //Models
    var Mentor = Parse.Object.extend("Mentor", {
        // Default attributes for the todo.
        defaults: {
          content: "Mentors not loaded...",
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
        /* todo boilerplate stuff.
        // Filter down the list of all todo items that are finished.
        done: function() {
          return this.filter(function(todo){ return todo.get('done'); });
        },
        // Filter down the list to only todo items that are still not finished.
        remaining: function() {
          return this.without.apply(this, this.done());
        },
        // We keep the Todos in sequential order, despite being saved by unordered
        // GUID in the database. This generates the next order number for new items.
        nextOrder: function() {
          if (!this.length) return 1;
          return this.last().get('order') + 1;
        },
        // Todos are sorted by their original insertion order.
        comparator: function(todo) {
          return todo.get('name');
        }*/
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
					//new FailureView();
					//self.undelegateEvents();
					//delete self;
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
            new SidebarView();
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
			// Setup the query for the collection to look for todos from the current user
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
			"click li"              : "toggleVisits",
		},
		initialize: function(){
			this.render();
			_.bindAll(this, 'render');
			this.model.bind('change', this.render);
			this.model.bind('destroy', this.remove);
			//whether the list of visits is displayed
			this.open = false;
		},
		/*for the toggle down visits functionality*/
		toggleVisits: function(){
			this.open =!this.open;
			this.$el.class("open", this.open);
		},
		render: function(){
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});
	
    var VisitListItemView = Parse.View.extend({
		element: 'li',
		events: {
			"click li"              : "openVisit",
		},
		
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

	new MainView;
	//Main view is what is drawn on load
});





