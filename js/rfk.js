$(function() {

    Parse.$ = jQuery;

    // Initialize Parse with your Parse application javascript keys
    Parse.initialize("5vJjW6VAiJdfBqyIEGgenZEip26b2NC5aZdVrC9A",
                     "cZbPecnNrzpf6NQkbwR09akfcZsfbH19Ps5hUBgf");
    //Models
    var Mentor = Parse.Object.extend("Mentor", {
        defaults: {
          content: "Mentor not loaded...",
        },
        initialize: function() {
          if (!this.get("content")) {
            this.set({"content": this.defaults.content});
          }
          
        }
    });

    var User = Parse.Object.extend("User", {
        defaults: {
        
          content: "Mentor not loaded...",
        },
        initialize: function() {
          if (!this.get("content")) {
            this.set({"content": this.defaults.content});
          }
          
        }
    });
    
    var TravelPoint = Parse.Object.extend("TravelPoint", {
        defaults: {
          content: "Travel point not loaded...",
        },
        initialize: function() {
          if (!this.get("content")) {
            this.set({"content": this.defaults.content});
          }
          
        }
    });
    
    var Visit = Parse.Object.extend("Visit", {
        defaults: {
          content: "Visit not loaded...",
        },
        initialize: function() {
          if (!this.get("content")) {
            this.set({"content": this.defaults.content});
          }
        }
    });
    
    //Collections
    var MentorList = Parse.Collection.extend({
        model: Mentor,
        /*initialize: function(){
            var data = this.get("Visits");
            this.unset("books", {silent: true});
            this.books = new Books(data);
        }*/
    });
    
    var VisitList = Parse.Collection.extend({
        model: Visit
    });
    
    var TravelPointList = Parse.Collection.extend({
        model: TravelPoint
    });
    
    //Views
    Parse.View.prototype.close = function(){
        this.remove();
        this.unbind();
        if (this.onClose){
            this.onClose();
        }
    }
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

            Parse.User.logIn(/([^@]+)/g.exec(username)[1], password, {
                success: function(user) {
                    new DashboardView();
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
        template: _.template($("#dashboard-template").html()),
        el: ".content",
        initialize: function(){
            _.bindAll(this, "logout", "render");
            this.render();
        },
        logout: function() {
            Parse.User.logOut();
            new LogInView();
            this.undelegateEvents();
            delete this;
        },
        render: function() {
            this.$el.html(this.template({currentUsername:Parse.User.current().getUsername()}));
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
            var mentors = new MentorList;
            mentors.query = new Parse.Query(Mentor);
            var userQ = new Parse.Query(User);

            mentors.query.include("User");
            mentors.comparator = function(mentor){
                return mentor.get('User').get('name');
            }
            mentors.bind('add',     this.addOne);
            mentors.bind('reset',   this.addAll);
            mentors.bind('all',     this.render);
                        
            mentors.fetch();
            
            this.mentors = mentors;
        },
        
        // Add a single mentor item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOne: function(mentor) {
            //var user = mentor.get('User');
            //var name = user.get('name');
            //mentor.set('name', name);
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
        }
    });
    
    var MentorListItemView = Parse.View.extend({
        element: 'li',
        template: _.template($('#mentor-item-template').html()),
        events: {
            "click .mentor-name": "toggleVisits",
        },
        initialize: function(){
            //this.$el.html(this.template(this.model.toJSON()));
            this.$el.html(this.template(this.model.attributes));
            _.bindAll(this, 'addOne', 'addAll', 'render');
            this.model.bind('change', this.render);
            this.model.bind('destroy', this.remove);
            //whether the list of visits is displayed
            this.open = false;
            // Create our collection of Visits
            this.visits = new VisitList;
            // Setup the query for the collection to look for todos from the current user
            this.visits.query = new Parse.Query(Visit);
            this.visits.query.equalTo("UserId", this.model.attributes.UserId);
            
            this.visits.bind('add',     this.addOne);
            this.visits.bind('reset',   this.addAll);
            this.visits.bind('all',     this.render);
            
            // Fetch all the todo items for this user
            this.visits.fetch();
        },
        /*for the toggle down visits functionality*/
        toggleVisits: function(){
            this.open = !this.open;
            console.log(this.open);
            this.$(".visit-list").toggleClass("expanded", open);
        },
        // Add a single visit item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOne: function(visit) {
            var view = new VisitListItemView({model: visit});
            this.$(".visit-list").append(view.render().el);
        },
        
        // Add all items in the visit collection at once.
        addAll: function(collection, filter) {
            this.$(".visit-list").html("");
            collection.each(this.addOne);
            if (collection.length == 0)  {
                this.$(".visit-list").append("<li class=\"emptyItem\">This Mentor has no visits.</li>");
            }
        },
        
        render: function(){
            return this;
        }
    });
    
    var VisitListItemView = Parse.View.extend({
        element: 'li',
        events: {
            "click li.li-visit" : "openVisit",
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
        openVisit: function(e){
            new VisitView({model: this.model});
        }
    });
    
    var VisitView = Parse.View.extend({
        el: "#visit",
        template: _.template($("#visit-template").html()),
        initialize: function(){
            /**render*/
            var visit = this.model.toJSON();
            visit.Start = moment(visit.Start.iso);
            visit.End = moment(visit.End.iso);
            this.$el.html(this.template(visit));

            _.bindAll(this, 'addOneTp', 'addAllTp', 'render');
            //this.$el.html(this.template(this.model.toJSON()));
            this.model.bind('change', this.render);
            this.model.bind('destroy', this.remove);
            // Create our collection of Visits
            this.TravelPoints = new TravelPointList;
            // Setup the query for the collection to look for todos from the current user
            this.TravelPoints.query = new Parse.Query(TravelPoint);
            this.TravelPoints.query.equalTo("VisitId", this.model.id);
            //XXX FIX THIS SO LONG TRIPS WORK 1000+ points
            this.TravelPoints.query.limit(1000);
            this.TravelPoints.bind('add',     this.addOneTp);
            this.TravelPoints.bind('reset',   this.addAllTp);
            this.TravelPoints.bind('all',     this.render);
            
            // Fetch all the todo itemsh for this user
            this.TravelPoints.fetch();
        },
        addOneTp: function(){
            console.log("addone called");
        },
        addAllTp: function(){
            new MapView({travelPoints: this.TravelPoints});
            console.log("added all travel ppoints");
        },
        render: function() {
            return this;
        },
        remove: function(){
            //this.model.unbind("change", this.render);
            alert("OHHHH BABY");
        }
    });

    var MapView = Parse.View.extend({
        el: "#map",
        template: _.template($("#map-template").html()),
        initialize: function(){
            this.render();
            _.bindAll(this, "render");
        },
        render: function() {
            this.$el.html(this.template());
            // this defaults to the cupertino area. as long as there is one point, it should be good tho
            var mapOptions = {
                zoom: 15,
                center: new google.maps.LatLng(37.33018889, -122.0258605),
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            var visitRoutePoints = [];
            var maxLat = maxTally(-180);
            var minLat = minTally(180);
            var maxLng = maxTally(-180);
            var minLng = minTally(180);
            var mapElement = this.$el.children('div');
            var bounds = new google.maps.LatLngBounds()
            this.options.travelPoints.map(function(travelPoint){
                var point = new google.maps.LatLng(travelPoint.attributes.Location.latitude, travelPoint.attributes.Location.longitude)
                bounds.extend(point);
                visitRoutePoints.push( point);
            });
            var latZoom = getZoomFromDegreeWidth( Math.abs(maxLat()-minLat()), mapElement.height());
            map = new google.maps.Map( mapElement.get(0),
                    mapOptions);
            var visitRoute = new google.maps.Polyline({
                path: visitRoutePoints,
                strokeColor: '#006600',
                strokeOpacity: 1.0,
                strokeWeight: 5
            });
            visitRoute.setMap(map)
            console.log("minLat" + minLat());
            console.log("maxLng" + maxLng());
            console.log("maxLat" + maxLat());
            console.log("minLng" + minLng());
            //TODO: make sure this works around 0 degrees*/
            map.fitBounds(bounds);
        }
    });

    $("#inputEmail").popover();
    new MainView;
    //Main view is what is drawn on load
});





