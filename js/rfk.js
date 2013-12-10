$(function() {

    Parse.$ = jQuery;

    // Initialize Parse with your Parse application javascript keys
    Parse.initialize("5vJjW6VAiJdfBqyIEGgenZEip26b2NC5aZdVrC9A",
                     "cZbPecnNrzpf6NQkbwR09akfcZsfbH19Ps5hUBgf");
    //Models
    var Kid = Parse.Object.extend("Kid");
    var Kid2Visit = Parse.Object.extend("Kid2Visit");
    var Mentor = Parse.Object.extend("Mentor");
    // I *UTTERLY DESPISE* parse for not providing a non-hacky, convient way 
    // to set defaults for undefined attributes in fetched objects
    var User = Parse.Object.extend("User", {
        _rebuildAllEstimatedData: function(){
            var retVal = Parse.Object.prototype._rebuildAllEstimatedData.apply(this, arguments);
            _.defaults(this.attributes, {
                Photo: {url:"img/anon.jpg"}
            });
            return retVal;
        }
    });
    var TravelPoint = Parse.Object.extend("TravelPoint");
    var Visit = Parse.Object.extend("Visit");
    var Comment = Parse.Object.extend("Comment");
    var Photo = Parse.Object.extend("Photo");
    
    //Collections
    var KidList = Parse.Collection.extend({ model: Kid });
    var MentorList = Parse.Collection.extend({ model: Mentor });
    var VisitList = Parse.Collection.extend({ model: Visit });
    var TravelPointList = Parse.Collection.extend({ model: TravelPoint });
    var CommentList = Parse.Collection.extend({ model: Comment });
    var PhotoList = Parse.Collection.extend({ model: Photo });

    var navBarCurrentView = 'visit';

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
            "click #signoutButton" : "logout",
        },
        model:{currentView: navBarCurrentView},
        template: _.template($("#dashboard-template").html()),
        el: ".content",
        initialize: function(){
            _.bindAll(this, "logout", "render");
            this.model.currentUsername = Parse.User.current().getUsername();
            this.delegateEvents();
            this.showVisitView();
        },
        render: function(){
            this.$el.html(this.template(this.model));
        },
        logout: function() {
            Parse.User.logOut();
            new LogInView();
            this.undelegateEvents();
            delete this;
        },
        showVisitView: function(){
            this.render();
            this.view = new VisitViewerView();
        }
    });

    var ManageMentorsView = Parse.View.extend({
        template: _.template($("#manage-mentors-template").html()),
        el: "#dashboardContainer",
        events: {
            "click #addMentorToggle":   "toggleAdd",
            "click #saveNewMentor":     "saveNewMentor"
        },
        initialize: function(){
            _.bindAll(this, 'addOneMentor', 'addAllMentors', 'render', 'saveNewMentor', 'toggleAdd');
            
            this.$el.html(this.template());
            // Create our collection of Mentors
            var mentors = new MentorList;
            mentors.query = new Parse.Query(Mentor);
            var userQ = new Parse.Query(User);

            mentors.query.include("User");
            mentors.query.include('User.Address');
            mentors.comparator = function(mentor){
                return mentor.get('User').get('name');
            }
            mentors.bind('add',     this.addOneMentor);
            mentors.bind('reset',   this.addAllMentors);
            mentors.bind('all',     this.render);
            mentors.fetch();
            
            this.mentors = mentors;
            // whether the add mentor button is on Add or Cancel (Current button is Add = true, Current button is Cancel = false)
            this.addMentor = true;
            this.render;
        },
        saveNewMentor: function(){
            //mentors are compound objects, so we have to create several things to make a new one
            var user = new User();
            user.set('name', this.$el.find('[name=mentorName]').val());
            user.set('username', this.$el.find('[name=mentorUsername]').val());
            user.set('password','test22');
            user.save(null, {
                success: function(user) {
                    // Execute any logic that should take place after the object is saved.
                    alert('New user created with objectId: ' + user);
                    var mentor = new Mentor();
                    mentor.set('User', {"__type":"Pointer","className":"_User","objectId": user.id});
                    mentor.save(null, {
                        success: function(mentor) {
                            alert('New mentor created with objectId: ' + mentor.id);
                        }
                    });
                }
            });
        },
        /*for the toggle down visits functionality*/
        toggleAdd: function(){
            // slides the add mentor table row up and down
            $('.toggleRow').stop().slideToggle(300);
            
            // changes the text, icon & color of the add mentor button with the cancel button
            if(!(this.addMentor = !this.addMentor)) {
                $('#addMentorToggle').removeClass('btn-success').addClass('btn-danger');
                $('#addMentorToggle span').text('Cancel');
                $('#addMentorToggle i').removeClass('glyphicon-plus').addClass('glyphicon-remove');
            }else {
                $('#addMentorToggle').removeClass('btn-danger').addClass('btn-success');
                $('#addMentorToggle span').text('Add Mentor');
                $('#addMentorToggle i').removeClass('glyphicon-remove').addClass('glyphicon-plus');
            }
        },
        // Add a single mentor item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOneMentor: function(mentor) {
            var view = new ManageMentorRowView({
                model: mentor, table: this.$el.find($('#manageMentorsTable'))});
        },
        // Add all items in the Mentors collection at once.
        addAllMentors: function(mentors, filter) {
            this.mentors = mentors;
            this.render();
        },

        render: function() {
            this.$("#manageMentorsTable tr:nth-child(n+2)").remove()
            new ManageMentorRowView({editMode:true,newForm:true, table:this.$el.find($('#manageMentorsTable'))});
            this.mentors.forEach(this.addOneMentor);
            this.delegateEvents();
        }
    });

    var ManageMentorRowView = Parse.View.extend({
        events: {
            "click .edit-mentor":   "toggleEdit"
        },
        template: _.template($("#manage-mentor-row-template").html()),
        initialize: function(){
            this.options = this.options || {};
            _.bindAll(this, 'toggleEdit', 'render');
            this.model = this.model || {};
            _.defaults(this.options, {
                newForm: false,
                editMode: false
            });
            this.el = $(this.options.table).append('<tr></tr>').find('tr').last();
            this.$el = $(this.el);
            this.render();
        },

        toggleEdit: function(event){
            this.editMode = !this.editMode;
            this.render();
        },
        render: function() {
            this.$el.replaceWith(this.template(_.extend({},this.model.attributes, this.options)));
            if(this.options.newForm){
                this.$el.children('td').wrapInner('<div class="toggleRow clearfix"></div>');
                this.$el.find('.toggleRow').hide();
            }
            this.delegateEvents();
        }
    });

    var VisitViewerView = Parse.View.extend({
        template: _.template($("#visit-viewer-template").html()),
        el: "#dashboardContainer",
        initialize: function(){
            _.bindAll(this, "render");
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
            new SidebarView();
            this.delegateEvents();
        }
    });
    
    var SidebarView = Parse.View.extend({
        el: "#sidebar",
        events: {
            "keyup #searchInput": "filter",
        },
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

            this.filterRegex = /./;
            mentors.fetch();
        },
        filter: function(){
            this.filterRegex = new RegExp(this.$el.find('#searchInput').val(),'i');
            this.render();
        },
        // Add a single mentor item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOne: function(mentor) {
            var view = new MentorListItemView({model: mentor});
            this.$("#mentor-list").append(view.render().el);
        },
        
        // Add all items in the Mentors collection at once.
        addAll: function(collection, filter) {
            this.mentors = collection;
            this.render();
        },
        
        render: function() {
            this.$("#mentor-list").html("");
            
            var filter = this.filterRegex;
            var filtered = this.mentors.filter(function(mentor){
                return filter.test(mentor.get('User').get('name'));
            });
            filtered.map(this.addOne);
        }
    });
    
    var MentorListItemView = Parse.View.extend({
        element: 'li',
        template: _.template($('#mentor-item-template').html()),
        events: {
            "click .mentor-name": "toggleVisits",
        },
        initialize: function(){
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
            var mentorQuery = new Parse.Query(Mentor);
            mentorQuery.equalTo("objectId",this.model.id); 
            this.visits.query.matchesKeyInQuery("Mentor", "objectId", mentorQuery);

            this.visits.query.include("Mentor");
            this.visits.query.include("Mentor.User");
            
            this.visits.bind('add',     this.addOne);
            this.visits.bind('reset',   this.addAll);
            this.visits.bind('all',     this.render);
            
            // Fetch all the todo items for this user
            this.visits.fetch();
        },
        /*for the toggle down visits functionality*/
        toggleVisits: function(){
            this.open = !this.open;
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
            var model = this.model;
            var kidList = new KidList;
            kidList.query = new Parse.Query(Kid);
            var kid2Visitquery = new Parse.Query(Kid2Visit);
            kid2Visitquery.equalTo("VisitId", this.model.id);
            kidList.query.matchesKeyInQuery("objectId", "KidId", kid2Visitquery);

            kidList.query.find({
                success: function(kids){
                    model.attributes.Kids = kids;
                    new VisitView({model: model});
                }
            });
        }
    });
    
    var VisitView = Parse.View.extend({
        el: "#visit",
        template: _.template($("#visit-template").html()),
        initialize: function(){
            /*render*/
            var visit = this.model.attributes;
            visit.Start = moment(visit.Start.iso);
            visit.End = moment(visit.End.iso);
            this.$el.html(this.template(visit));

            _.bindAll(this, 'addOneTp', 'addAllTp', 'render');
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
            this.getLogItems();
        },
        addOneTp: function(){
        },
        getLogItems: function(){
            this.$("#visitlog").html("");
            new VisitLogView({model: this.model});
        },
        addAllTp: function(){
            new MapView({travelPoints: this.TravelPoints});
        },
        render: function() {
            return this;
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
            var bounds = new google.maps.LatLngBounds()
            this.options.travelPoints.map(function(travelPoint){
                var point = new google.maps.LatLng(travelPoint.attributes.Location.latitude, travelPoint.attributes.Location.longitude)
                bounds.extend(point);
                visitRoutePoints.push( point);
            });
            map = new google.maps.Map( this.$el.children('div').get(0),
                    mapOptions);
            var visitRoute = new google.maps.Polyline({
                path: visitRoutePoints,
                strokeColor: '#006600',
                strokeOpacity: 1.0,
                strokeWeight: 5
            });
            visitRoute.setMap(map);
            map.fitBounds(bounds);
        }
    });

    var VisitLogView = Parse.View.extend({
        el: "#visitLog",
        template: _.template($("#loglist-template").html()),
        initialize: function(){
            this.$el.html(this.template());
            _.bindAll(this, "addAllComments", "addAllPhotos");
            this.Photos = new PhotoList;
            this.Photos.query = new Parse.Query(Photo);
            this.Photos.query.equalTo("VisitId", this.model.id);
            this.Photos.query.limit(1000);
            this.Photos.query.ascending("createdAt");
            this.Photos.bind('add',     this.addOnePhoto);
            this.Photos.bind('reset',   this.addAllPhotos);
            this.Photos.bind('all',     this.render);
            this.Photos.comparator = function(photo){
                return photo.createdAt;
            }
            this.Photos.fetch();

            this.Comments = new CommentList;
            this.Comments.query = new Parse.Query(Comment);
            this.Comments.query.equalTo("VisitId", this.model.id);
            this.Comments.query.limit(1000);
            this.Comments.query.ascending("createdAt");
            this.Comments.bind('add',       this.addOneLogItem);
            this.Comments.bind('reset',     this.addAllComments);
            this.Comments.bind('all',       this.render);
            this.Comments.comparator = function(comment){
                return comment.createdAt;
            }
            this.Comments.fetch();
            this.latch = latch(2,this,function(collection1, collection2){
                if(collection1.length+collection2.length == 0){
                    // hack in a 'yo,homes we don't got no comments'
                    // legitimately, this sucks and is horrible and should be in a view.
                    $('#logitem-list').append('<li id="no-comments" class="visitComment">&laquo; No comments were made on this visit &raquo;</li>');
                }
                /* DE-IMBECILE collections. seriously, how is it to *actually* 
                  implment the backbone interface you say you implement in your effing docs!?!?*/
                collection1.unshift = function(){
                    var toReturn = this.at(0);
                    this.remove(toReturn);
                    return toReturn;
                }
                collection2.unshift = collection1.unshift;
                while(collection1.length + collection2.length > 0){
                    !function(model){
                        if(model.className === "Comment")
                            new CommentView({model: model});
                        else if(model.className === "Photo")
                            new PhotoView({model: model});
                    }( collection2.length === 0 || (collection1.length > 0 && collection1.at(0).createdAt < collection2.at(0).createdAt )?
                             collection1.unshift():collection2.unshift());
                }
            });
        },
        addAllComments: function(collection, filter){
            this.latch(collection);
        },
        addAllPhotos: function(collection, filter){
            this.latch(collection);
        }
    });

    var CommentView = Parse.View.extend({
        el: '#logitem-list',
        template: _.template($("#comment-template").html()),
        initialize: function(){
            this.model.attributes.createdAt = moment(this.model.createdAt);
            this.$el.append(this.template(this.model.attributes));
        },
    });

    var PhotoView = Parse.View.extend({
        el: '#logitem-list',
        template: _.template($("#photo-template").html()),
        initialize: function(){
            this.model.attributes.createdAt = moment(this.model.createdAt);
            this.model.attributes.id = this.model.id;
            this.$el.append(this.template(this.model.attributes));
        },
    });
           
    $("#inputEmail").popover();
    //Main view is what is drawn on load
    new MainView;

    var AppRouter = Parse.Router.extend({
        routes: {
            "visits": "visitPage",
            "mentors": "manageMentors",
            "*actions": "defaultRoute" // Backbone will try match the route above first
        }
    });

    // Instantiate the router
    var app_router = new AppRouter;
    app_router.on('route:visitPage', function () {
        navBarCurrentView = 'visit';
        new VisitViewerView();
    });

    app_router.on('route:manageMentors', function () {
        // navBarCurrentView NEEEEEEEDS TO WORK! No idea...
        navBarCurrentView = 'manageMentors';
        new ManageMentorsView();
    });

    app_router.on('route:defaultRoute', function (actions) {
       
    });

    // Start history a necessary step for bookmarkable URL's
    Parse.history.start(); 
});





