$(function() {

	Parse.$ = jQuery;

	// Initialize Parse with your Parse application javascript keys
	Parse.initialize("5vJjW6VAiJdfBqyIEGgenZEip26b2NC5aZdVrC9A",
					 "cZbPecnNrzpf6NQkbwR09akfcZsfbH19Ps5hUBgf");

	//Models
	// I *UTTERLY DESPISE* parse for not providing a non-hacky, convient way 
	// to set defaults for undefined attributes in fetched objects
	var User = Parse.Object.extend("User", {
		_rebuildAllEstimatedData: function(){
			var retVal = Parse.Object.prototype._rebuildAllEstimatedData.apply(this, arguments);
			_.defaults(this.attributes, {
				Photo: {url:"img/anon.png"}
			});
			return retVal;
		}
	});

	var Role = Parse.Object.extend("_Role");
	var Kid = Parse.Object.extend("Kid");
	var Kid2Visit = Parse.Object.extend("Kid2Visit");
	var Mentor2Kid = Parse.Object.extend("Mentor2Kid");
	var Mentor = Parse.Object.extend("Mentor");
	var TravelPoint = Parse.Object.extend("TravelPoint");
	var Visit = Parse.Object.extend("Visit");
	var Comment = Parse.Object.extend("Comment");
	var Photo = Parse.Object.extend("Photo");
	var Organization = Parse.Object.extend("Organization");
	var Address = Parse.Object.extend("Address");
	
	//Collections
	var UserList = Parse.Collection.extend({ model: User });
	var KidList = Parse.Collection.extend({ model: Kid });
	var Mentor2KidList = Parse.Collection.extend({ model: Mentor2Kid });
	var MentorList = Parse.Collection.extend({ model: Mentor });
	var VisitList = Parse.Collection.extend({ model: Visit });
	var TravelPointList = Parse.Collection.extend({ model: TravelPoint });
	var CommentList = Parse.Collection.extend({ model: Comment });
	var PhotoList = Parse.Collection.extend({ model: Photo });
	var OrganizationList = Parse.Collection.extend({ model: Organization });

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
				this.dashboard = new DashboardView();
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
		model: {},
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
		},
		highlight: function(link) {
			// remove active from all tab
			$( "#navLinks li" ).each(function() {
				$( this ).removeClass("active");
			});
			// add active to the desired tab
			switch(link) {
				case "visits":
					$("#visitTopNav").addClass("active");
					break;
				case "admin":
					$("#adminTopNav").addClass("active");
					break;
				default:
					// default to visit view
					$("#visitTopNav").addClass("active");
					break;
			}
		}
	});
	
	var AdminView = Parse.View.extend({
		template: _.template($("#admin-template").html()),
		el: "#dashboardContainer",
		model: {},
		events: {},
		initialize: function() {
			_.bindAll(this, "render");
			this.render();
			new AdminListView();
		},
		render: function() {
			this.$el.html(this.template());
		}
	});

	var AdminListView = Parse.View.extend({
		template: _.template($("#admin-list-pane-template").html()),
		el: "#adminListPane",
		events: {
			"click #toggleMentors": "toggleUserInclude",
			"click #toggleDirectors": "toggleUserInclude",
			"click #toggleKids": "toggleUserInclude",
			"keyup .searchInput": "filter",
		},
		filterRegex: /./,
		include:{
			mentors:   true,
			kids:      true,
			directors: true
		},
		initialize: function() {
			_.bindAll(this, 'render', 'getUserObjects', 'toggleUserInclude', 'closeChildViews', 'filter');
			this.$el.html(this.template());
			this.list = [];
			this.getUserObjects();
		},
		toggleUserInclude: function(e){
			var includeType = $(e.currentTarget).attr('id').match(/toggle(.*)/)[1].toLowerCase();
			this.include[includeType] = !this.include[includeType];
			$(e.currentTarget).children('.glyphicon').toggleClass("glyphicon-check", this.include[includeType]);
			$(e.currentTarget).children('.glyphicon').toggleClass("glyphicon-unchecked", !this.include[includeType]);

			this.list = this.cleanList.filter(function(user){
				if(user.model instanceof User && this.include.directors){
					return true;
				}else if(user.model instanceof Kid && this.include.kids){
					return true;
				}else if(user.model instanceof Mentor && this.include.mentors){
					return true;
				}else return false;
			}.bind(this));
			this.render();
		},
		getUserObjects: function(){
			var latchCount = 0;
			latchCount++;
			var mentors = new MentorList();
			mentors.query = new Parse.Query(Mentor);
			mentors.query.include("User");
			mentors.query.include('User.Address');
			mentors.query.include("User.organization");
			mentors.bind('reset', function(toAdd){
					toAdd.models.map(function(e){this.list.push({model:e})}.bind(this));
					listLatch();
				}.bind(this));
			mentors.fetch();
			latchCount++;
			var directorRoleQuery = new Parse.Query(Role);
			directorRoleQuery.equalTo("name", "Director");
			directorRoleQuery.first({
				success: function(role) {
					var directors = new UserList();
					directors.query = role.relation('users').query();
					directors.query.include('Address');
					directors.query.include('organization');
					directors.bind('reset', function(toAdd){
						toAdd.models.map(function(e){this.list.push({model:e})}.bind(this));
						listLatch();
					}.bind(this));
					directors.fetch();
				}.bind(this),
				error: function(error) {
					console.log("Error: " + error.code + " " + error.message);
				}
			});
			latchCount++;
			var kids = new KidList();
			kids.query = new Parse.Query(Kid);
			kids.bind('reset', function(toAdd){
					toAdd.models.map(function(e){this.list.push({model:e})}.bind(this));
					listLatch();
				}.bind(this));
			kids.fetch();
			latchCount++
			this.organizations = new OrganizationList();
			this.organizations.query = new Parse.Query(Organization);
			this.organizations.bind('reset', function(organizations){
					listLatch();
				}.bind(this));
			this.organizations.fetch();
			var listLatch = latch(latchCount, this, function(){
				this.list.sort(function(a,b){
					var getUsername = function(o){
						if(o instanceof Mentor) return o.get('User').get('name');
						if(o instanceof User) return o.get('name');
						if(o instanceof Kid) return o.get('FirstName');
						alert("couldn't get username"); return "";
					};
					return getUsername(a.model).trim().localeCompare(
							getUsername(b.model).trim());
				});
				this.cleanList = this.list.slice();
				this.render()
			}.bind(this));
		},
		closeChildViews: function(){
			this.list.map(function(user){
				if(user.view.beingViewed){
					user.view.close();
				}
			});
		},
		filter: function(){
			this.filterRegex = new RegExp(this.$el.find('.searchInput').val(),'i');
			this.render();
		},
		render: function() {
			this.$el.find('#adminList').html('');
			this.list.map(function(user){
				if(user.model instanceof Mentor &&
						this.filterRegex.test(user.model.get('User').get('name'))){
					var el = this.$el.find('#adminList').append('<li></li>').find('li').last();
					user.view = new AdminMentorListItemView({model: user.model, el: el, parentList: this});
				}else if(user.model instanceof User &&
						this.filterRegex.test(user.model.get('name'))){
					var el = this.$el.find('#adminList').append('<li></li>').find('li').last();
					user.view = new AdminDirectorListItemView({model: user.model, el: el, parentList: this});
				}else if(user.model instanceof Kid &&
						this.filterRegex.test(user.model.get('FirstName'))){
					var el = this.$el.find('#adminList').append('<li></li>').find('li').last();
					user.view = new AdminKidListItemView({model: user.model, el: el, parentList: this});
				}
			}.bind(this));
		}
	});

	var AdminListItemView = Parse.View.extend({
		events: {
			"click":   "openDetail"
		},
		beingViewed: false,
		initialize: function(options) {
			_.bindAll(this, "render", "openDetail");
			this.render();
			this.parentList = options.parentList;
		},
		close: function(){
			this.beingViewed = false;
			if(this.detailView) this.detailView.undelegateEvents();
			this.render();
		},
		openDetail: function(){
			this.parentList.closeChildViews();
			this.detailView = this.detailView || new (this.detailview())({model: this.model, organizations:this.parentList.organizations});
			this.detailView.delegateEvents();
			this.beingViewed = true;
			this.render();
		},
		render: function() {
			this.$el.html(this.template(this.model));
			this.$el.toggleClass('beingViewed', this.beingViewed);
			this.$el.find("span > span:last-child").toggleClass('glyphicon-chevron-right', this.beingViewed);
			if(this.detailView && this.beingViewed) this.detailView.render();
		}
	});

	var AdminDirectorListItemView = AdminListItemView.extend({
		template: _.template($("#admin-director-list-item-template").html()),
		detailview: function(){return AdminDirectorDetailView}
	});

	var AdminMentorListItemView = AdminListItemView.extend({
		template: _.template($("#admin-mentor-list-item-template").html()),
		detailview: function(){return AdminMentorDetailView}
	});

	var AdminKidListItemView = AdminListItemView.extend({
		template: _.template($("#admin-kid-list-item-template").html()),
		detailview: function(){return AdminKidDetailView}
	});

	var AdminDetailView = Parse.View.extend({
		events: {
			"keyup input": "showSave",
			"change select": "showSave",
			"click .detail-save > button": "save"
		},
		initialize: function(){
			_.bindAll(this, "save", "render", "showSave", "hideSave", "assign", "addFieldView");
			this.fieldViews = [];
		},
		assign: function (view, selector) {
			view.setElement(this.$(selector))
			view.render();
		},
		showSave: function(){
			$('.detail-save').addClass("show");
		},
		hideSave: function(){
			$('.detail-save').removeClass("show");
		},
		addFieldView: function(options){
			_.defaults(options,{type:  'text',
								label: function(string){ //Default the label to the uppercased property name
									return string.charAt(0).toUpperCase() + string.slice(1);
								}(options.path!=null?options.path.split('.').slice(-1)[0]:'')})
			var object = options.path!=null?options.path.split('.').reduce(function(o,k){
					return o.get(k);
				}, this.model):{};
			var parentObject = options.path!=null?options.path.split('.').slice(0,-1).reduce(function(o,k){
					return o.get(k);
				}, this.model):{};
			if(options.type == 'address'){
				this.fieldViews.push({
					el_class: '.address',
					view: new AdminDetailAddressView({
						parent: this,
						el: '.address',
						model: object,
						save: function(o){
							if(o == null){
								parentObject.unset(options.path.split('.').slice(-1)[0])
							}else
								parentObject.set(options.path.split('.').slice(-1)[0],o)
						}
					})
				});
			}else if(options.type == 'select'){
				var el_class = '.'+options.path.split('.').pop();
				this.fieldViews.push({
					el_class: el_class,
					view: new AdminDetailSelectView({
						parent: this,
						el: el_class,
						objectList: options.options,
						model: {
							label: options.label,
							options: options.options.map(function(o){
								return {id:   o.id,
										name: o.get('Name') || "",
										selected: object && o.id==object.id};
							}.bind(this))
						},
						save: function(o){
							if(o == null){
								parentObject.unset(options.path.split('.').slice(-1)[0])
							}else
								parentObject.set(options.path.split('.').slice(-1)[0],o)
						}
					})
				});
			}else if(options.type == 'name') {
				var el_class = '.'+options.path.split('.').pop().toLowerCase();
				this.fieldViews.push({
					el_class: el_class,
					view: new AdminDetailNameView({
						parent: this,
						el: el_class,
						model: {
							value:  options.type=='date'?
							            object==undefined?
							            "":moment(object).format('YYYY-MM-DD'):
							        object,
							placeholder: options.placeholder,
							type: options.type
						},
						save: function(o){
							if(o == null)
								parentObject.unset(options.path.split('.').slice(-1)[0])
							else
								parentObject.set(options.path.split('.').slice(-1)[0],o)
						}
					})
				});
			}else if( options.type == 'kidpairer'){
				var el_class = '.kids';
				this.fieldViews.push({
					el_class: el_class,
					view: new AdminDetailMentorKidListTemplate({
						parent: this,
						el: el_class,
						model: options.model
					})
				});
			}else{
				var el_class = '.'+options.path.split('.').pop().toLowerCase();
				this.fieldViews.push({
					el_class: el_class,
					view: new AdminDetailBasicView({
						parent: this,
						el: el_class,
						model: {
							label: options.label,
							value:  options.type=='date'?
							            object==undefined?
							            "":moment(object).format('YYYY-MM-DD'):
							        object,
							placeholder: options.placeholder,
							type: options.type
						},
						save: function(o){
							if(o == null)
								parentObject.unset(options.path.split('.').slice(-1)[0])
							else
								parentObject.set(options.path.split('.').slice(-1)[0],o)
						}
					})
				});
			}
		},
		save: function(){
			//save back
			this.fieldViews.map(function(fv){fv.view.save()});
			if(this.model instanceof Kid){
				this.model.save().done(function(){
					console.log("The changes were save successfully.");
				}).fail(function(){
					console.log("The save failed. No Changes were made.");
				});
			}else{
				var user; // don't be fooled. there is NO blocks scope in js.
				if(this.model instanceof User){
					user = this.model;
				}else if(this.model instanceof Mentor){
					// eventually we need to save mentors here
					user = this.model.get('User');
				}
				this.model.save().always(function(){
					Parse.Cloud.run('modifyUser', {
						objectId: user.id,
						// we always want to save the address back, so that incase a new one needed to be created we know
						newUser: user.toJSON()
					}, {
						success: function(result) {
							console.log("The changes were save successfully.");
						},
						error: function(error) {
							console.log("The save failed for the following reason: ");
							console.log(error);
						}
					});
				});
			}
		},
		render: function() {
			this.$el.html(this.template(this.model));
			this.fieldViews.map(function(fv){
				this.assign(fv.view, fv.el_class);
			}.bind(this));
		}
	});

	// detail view for a mentor
	var AdminMentorDetailView = AdminDetailView.extend({
		template: _.template($("#admin-mentor-detail-template").html()),
		el: "#adminDetailPane",
		initialize: function() {
			AdminDetailView.prototype.initialize.apply(this);
			_.bindAll(this, "render");
			this.render();
			this.addFieldView({ path:        'User.name',
								type:         "name" });
			this.addFieldView({ path:        'User.Address',
								type:        'address' });
			this.addFieldView({ path:        'User.phone',
								placeholder: 'XXX - XXX - XXXX' });
			this.addFieldView({ path:        'User.Birth',
								label:       'Birthdate',
								type:        'date' });
			this.addFieldView({ path:        'User.username' });
			this.addFieldView({ path:        'User.email',
								placeholder: 'name@example.com' });
			this.addFieldView({ path:        'User.organization',
								options:     this.options.organizations,
								type:        'select' });
			this.addFieldView({ type:        'kidpairer',
								model:        this.model});
		}
	});

	// detail view for a kid
	var AdminKidDetailView = AdminDetailView.extend({
		template: _.template($("#admin-kid-detail-template").html()),
		el: "#adminDetailPane",
		initialize: function() {
			AdminDetailView.prototype.initialize.apply(this);
			_.bindAll(this, "render");
			this.render();
			this.addFieldView({ path:        'name',
								type:         "name" });
			this.addFieldView({ path:        'Birthday',
								label:       'Birthdate',
								type:        'date', });
			this.addFieldView({ path:        'organization',
								options:     this.options.organizations,
								type:        'select'});
		}
	});
	// detail view for a director
	var AdminDirectorDetailView = AdminDetailView.extend({
		template: _.template($("#admin-director-detail-template").html()),
		el: "#adminDetailPane",
		initialize: function() {
			AdminDetailView.prototype.initialize.apply(this);  
			_.bindAll(this, "render");
			this.render();
			this.addFieldView({ path:        'name',
								type:         "name" });
			this.addFieldView({ path:        'Address',
								type:        'address' });
			this.addFieldView({ path:        'phone',
								placeholder: 'XXX - XXX - XXXX' });
			this.addFieldView({ path:        'Birth',
								label:       'Birthdate',
								type:        'date' });
			this.addFieldView({ path:        'username' });
			this.addFieldView({ path:        'email',
								placeholder: 'name@example.com' });
			this.addFieldView({ path:        'organization',
								options:     this.options.organizations,
								type:        'select' });
		}
	});
	// detail view for an address, including editing capabilities
	var AdminDetailAddressView = Parse.View.extend({
		template: _.template($("#admin-detail-address-template").html()),
		initialize: function() {
			_.bindAll(this, "render");
			this.model = this.model || new Address();
			this.render();
		},
		save: function(){
			this.model.set({
				Address: this.$el.find('input.line1').val(),
				Address2: this.$el.find('input.line2').val(),
				City: this.$el.find('input.city').val(),
				State: this.$el.find('input.state').val(),
				Zip: this.$el.find('input.zip').val(),
			})
			this.options.save(this.model);
		},
		render: function() {
			this.$el.html(this.template(this.model));
		}
	});

	var AdminDetailBasicView = Parse.View.extend({
		template: _.template($("#admin-detail-basic-template").html()),
		initialize: function() {
			 this.options.save = this.options.save || function(){};
			_.bindAll(this, "render", "save");
			_.defaults(this.model,{type:"text", placeholder:''});
			this.render();
		},
		save: function(){
			this.options.save( this.model.type == 'date'?
						moment(this.$el.find("input").val())==null?
							null:
							moment(this.$el.find("input").val()).toDate():
					nullIfBlank(this.$el.find("input").val())
					);
		},
		render: function() {
			this.$el.html(this.template(this.model));
		}
	});

	var AdminDetailNameView = Parse.View.extend({
		template: _.template($("#admin-detail-name-template").html()),
		initialize: function() {
			 this.options.save = this.options.save || function(){};
			_.bindAll(this, "render", "save");
			_.defaults(this.model,{type:"text", placeholder:''});
			this.render();
		},
		save: function(){
			this.options.save( this.model.type == 'date'?
						moment(this.$el.find("input").val())==null?
							null:
							moment(this.$el.find("input").val()).toDate():
					nullIfBlank(this.$el.find("input").val())
					);
		},
		render: function() {
			this.$el.html(this.template(this.model));
		}
	});

	var AdminDetailSelectView = Parse.View.extend({
		template: _.template($("#admin-detail-select-template").html()),
		initialize: function() {
			this.options.save = this.options.save || function(){};
			_.bindAll(this, "render", "save");
			this.render();
		},
		save: function(){
			var newObject = this.options.objectList.filter(function(o){
				return o.id == this.$el.find("select").val()
			}.bind(this))[0];
			this.options.save(newObject);
		},
		render: function() {
			this.$el.html(this.template(this.model));
		}
	});

//XXX THIS IS BAD BAD BAD BAD. right now we are relying on names to be unique ids for kids
// this is just to get it usable in the hands of beta testers. a high priority will be to add picutres
// and unique ids behinds the scenes. 
	var AdminDetailMentorKidListTemplate = Parse.View.extend({
		template: _.template($("#admin-detail-mentor-kid-list-template").html()),
		assign: function (view, selector) {
			view.setElement(this.$(selector))
			view.render();
		},
		initialize: function() {
			this.kidList = [];
			_.bindAll(this, "render", "save", "remove", "assign", "add");
			var kidsReadyLatch = latch(2,this,function(){
				this.mentor2kid.each(function(k2m){
					this.kidList.push({
						model: k2m.get("Kid"),
						view: new AdminDetailMentorKidListItemTemplate({
							model: k2m.get("Kid"),
							parent: this
						})
					});
				}.bind(this));
				this.kidList.push({
					model: null,
					view: new AdminDetailMentorKidListItemTemplate({
						model: null,
						parent: this
					})
				});
				this.render();
			});
			this.render();
			this.mentor2kid = new Mentor2KidList();
			this.mentor2kid.query = new Parse.Query(Mentor2Kid);
			this.mentor2kid.query.include('Kid');
			this.mentor2kid.query.equalTo('Mentor', {"__type":"Pointer","className":"Mentor","objectId": this.model.id});
			this.mentor2kid.bind('reset', kidsReadyLatch);
			this.mentor2kid.fetch();

			this.kids = new KidList();
			this.kids.query = new Parse.Query(Kid);
			this.kids.bind('reset', kidsReadyLatch);
			this.kids.fetch();

		},
		save: function(){
			//add new kids that are allwed
			this.kidList.map(function(localKid){
				var kid = localKid.model;
				if(kid == null) return;//if its the fake new kid on the end of the list, don't try to save him. this is bad design.
				//if we already have a kid listed, don't save a new relation
				if(this.mentor2kid.find(function(m2k){
					return _.isEqual(m2k.get('Kid'),kid);
				})) return;
				var m2k = new Mentor2Kid();
				this.mentor2kid.add(m2k);
				m2k.set('Kid', kid);
				m2k.set('Mentor', {"__type":"Pointer","className":"Mentor","objectId": this.model.id});
				m2k.save().fail(function(a){
					console.log("m2k save: " + a);
				});
			}.bind(this));
			//remove deauthed kids...
			this.mentor2kid.each(function(m2k){
				var kid = m2k.get("Kid");
				if(kid == null) return;//this shoulld actually ever happen, but
				if(this.kidList.reduce(function(p, localKid){ // this is janky, but I don't like those f***ing for loops like c has,
					return p || _.isEqual(localKid.model,kid);
				}, false)) return; //we found a match, we don't have to delete our m2k entry
				this.mentor2kid.remove(m2k);
				m2k.destroy();
			}.bind(this));

		},
		render: function() {
			this.$el.html(this.template({}));
			this.kidList.map(function(k){
				this.$('ul').append('<li></li>');
				this.assign(k.view, 'ul > li:last-child')
			}.bind(this));
		},
		remove: function(kidpairview){
			this.kidList = this.kidList.filter(function(k){
				return k.model != kidpairview.model;
			});
			kidpairview.$el.remove();
		},
		add: function(kidpairview){
			var newKid = kidpairview.$('.kid-name').eq(1).typeahead('val');
			if(newKid == "") return;
			var firstName = newKid.match(/^\w+/)[0];
			var lastInitial = newKid.match(/\w$/)[0];
			newKid = this.kids.find(function(k){
				return k.get('FirstName') == firstName && k.get('LastInitial') == lastInitial;
			});
			if( newKid == undefined)
				return;
			if(_.find(this.kidList, function(kObj){
				return _.isEqual(kObj.model, newKid);
			})){
				alert("already authorized");
				return;
			}
			this.kidList[this.kidList.length-1].model = newKid;
			this.kidList[this.kidList.length-1].view.model = newKid;
			this.kidList.push({
				model: null,
				view: new AdminDetailMentorKidListItemTemplate({
					model: null,
					parent: this
				})
			});
			this.render();
		}
	});

	var AdminDetailMentorKidListItemTemplate = Parse.View.extend({
		template: _.template($("#admin-detail-mentor-kid-list-item-template").html()),
		events:{
			'click .close': 'delete',
			'click .add-kid-pair': 'add',
		},
		initialize: function() {
			_.bindAll(this, "render", "delete", "add");
			this.render();
		},
		delete: function(){
			this.options.parent.remove(this);
		},
		add: function(){
			this.options.parent.add(this);
		},
		render: function() {
			this.$el.html(this.template({value:this.model?this.model.get('FirstName')+' '+this.model.get('LastInitial'):''}));
			
			//the TypeAhead shtufff
			var kidBloodhound = new Bloodhound({
				datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
				queryTokenizer: Bloodhound.tokenizers.whitespace,
				local: this.options.parent.kids.map(function(kid) { return { value: kid.get('FirstName')+' '+kid.get('LastInitial'), id: kid.id }; })
			});
			// kicks off the loading/processing of `local` and `prefetch`
			kidBloodhound.initialize();
			this.$('.kid-name').typeahead({
				hint: true,
				highlight: true,
				minLength: 1
			},{
				name: 'states',
				displayKey: 'value',
				// `ttAdapter` wraps the suggestion engine in an adapter that
				// is compatible with the typeahead jQuery plugin
				source: kidBloodhound.ttAdapter(),
				templates: {
					empty: [
						'<div class="no-kids-found">',
							'No kids found',
						'</div>'
					].join('\n'),
				}
			});
		}
	});
/*
	
*/

/* these are not needed
	var ManageMentorsView = Parse.View.extend({
		template: _.template($("#admin-template").html()),
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
		//for the toggle down visits functionality
		tggleAdd: function(){
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
			"click .edit-mentor":   "toggleEdit",
			"click .cancel-edit-mentor" : "toggleEdit",
			"click .delete-mentor" : "deleteMentor"
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
			this.options.editMode = !this.options.editMode;
			this.render();
		},
		deleteMentor: function(event){
			var username = this.model.get('User').get('username')
			if(prompt('Are you sure you want to delete the Mentor "'+username+
				'"? to confirm, please type the Mentor\'s username:') != username)
				return;
			alert("I deleted him");
		},
		render: function() {
			var newEl = $(this.template(_.extend({},this.model.attributes, this.options)));
			this.$el.replaceWith(newEl);
			this.$el = newEl;
			if(this.options.newForm){
				this.$el.children('td').wrapInner('<div class="toggleRow clearfix"></div>');
				this.$el.find('.toggleRow').hide();
			}
			this.delegateEvents();
		}
	});
	*/
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
			"keyup .searchInput": "filter",
		},
		template: _.template($("#side-bar-template").html()),
		initialize: function(){
			var self = this;
			_.bindAll(this, 'addOne', 'addAll', 'render');
			
			this.$el.html(this.template({}));
			 
			// Create our collection of Mentors
			this.mentors = new MentorList;
			this.mentors.query = new Parse.Query(Mentor);
			var userQ = new Parse.Query(User);

			this.mentors.query.include("User");
			this.mentors.comparator = function(mentor){
				return mentor.get('User').get('name');
			}
			this.mentors.bind('add',     this.addOne);
			this.mentors.bind('reset',   this.addAll);
			this.mentors.bind('all',     this.render);

			this.filterRegex = /./;
			this.mentors.fetch();
		},
		filter: function(){
			this.filterRegex = new RegExp(this.$el.find('.searchInput').val(),'i');
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
			this.visits.query.ascending("End");

			this.visits.query.include("Mentor");
			this.visits.query.include("Mentor.User");
			
			this.visits.bind('add',     this.addOne);
			this.visits.bind('reset',   this.addAll);
			this.visits.bind('all',     this.render);
			
			// Fetch all the todo items for this user
			this.visits.fetch();
		},
		// for the toggle down visits functionality
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
			this.model.attributes.Kids = new KidList();
			//whether the list of visits is displayed
			this.open = false;
		},
		render: function(){
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},
		openVisit: function(e){
			var kid2Visitquery = new Parse.Query(Kid2Visit);
			kid2Visitquery.equalTo("Visit", {"__type":"Pointer","className":"Visit","objectId": this.model.id});
			kid2Visitquery.include("Kid");
			kid2Visitquery.find().done(function(kid2visits){
				kid2visits.map(function(k2v){
					this.model.attributes.Kids.add(k2v.get("Kid"));
				}.bind(this));
				new VisitView({model: this.model});
			}.bind(this));
		}
	});
	
	var VisitView = Parse.View.extend({
		el: "#visit",
		template: _.template($("#visit-template").html()),
		initialize: function(){
			/*render*/
			var visit = this.model.attributes;
			visit.Start = moment(visit.Start);
			visit.End = moment(visit.End);
			this.$el.html(this.template(visit));

			_.bindAll(this, 'createVisitLog', 'createMap', 'render');
			this.model.bind('change', this.render);
			this.model.bind('destroy', this.remove);

			var geocodeComments = function(){
				// initialize the geocoder to do a reverse geolocation for each comment
				var geocoder = new google.maps.Geocoder();
				var commentLatch = latch(this.Comments.length,null,finalLatch);
				this.Comments.map(function(comment){

					var latlng = new google.maps.LatLng(comment.get("Location").latitude, comment.get("Location").longitude);
					var address = "Location Unknown";

					// make reverse geolocation call
					geocoder.geocode({ 'latLng': latlng }, function (results, status) {
						if (status !== google.maps.GeocoderStatus.OK) {
							alert(status);
						}
						// This is checking to see if the Geoeode Status is OK before proceeding
						if (status == google.maps.GeocoderStatus.OK) {
							address = (results[0].formatted_address);
							comment.set('address', address);
						}
						commentLatch();
					});
				});
			}.bind(this);

			var finalLatch = latch(2,this,function(){
				this.createVisitLog();
				this.createMap();
			}.bind(this));

			// Create our collection of Visits
			this.TravelPoints = new TravelPointList;
			// Setup the query for the collection to look for todos from the current user
			this.TravelPoints.query = new Parse.Query(TravelPoint);
			this.TravelPoints.query.equalTo("Visit", {"__type":"Pointer","className":"Visit","objectId": this.model.id});
			//XXX FIX THIS SO LONG TRIPS WORK 1000+ points
			this.TravelPoints.query.limit(1000);
			this.TravelPoints.query.ascending("TimeLogged")
			this.TravelPoints.bind('add',     this.addOneTp);
			this.TravelPoints.bind('reset',   finalLatch);
			this.TravelPoints.bind('all',     this.render);
			this.TravelPoints.fetch();

			// fetch all the comments for this visit
			this.Comments = new CommentList;
			this.Comments.query = new Parse.Query(Comment);
			this.Comments.query.equalTo("Visit", {"__type":"Pointer","className":"Visit","objectId": this.model.id});
			this.Comments.query.limit(1000);
			this.Comments.query.ascending("createdAt");
			this.Comments.bind('reset',   geocodeComments);
			this.Comments.fetch();


		},
		createVisitLog: function(){
			this.$("#visitlog").html("");
			new VisitLogView({model: this.model, comments: this.Comments});
		},
		createMap: function(){
			new MapView({travelPoints: this.TravelPoints, comments: this.Comments});
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
				var point = new google.maps.LatLng(comment.get("Location").latitude, comment.get("Location").longitude)
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

			// initialize the geocoder to do a reverse geolocation for each comment
			var geocoder = new google.maps.Geocoder();

			this.options.comments.map(function(comment){

				// create the popup for when a location marker is clicked on the map
				var contentString = '<div id="content">'+
				'<div id="bodyContent">'+
				'<h4>'+
					comment.attributes.Text +
				'</h4>'+
				'<p>Comment created: '+ 
				moment(comment.createdAt).format('MMMM Do YYYY h:mm a')+
				'</br>Location: '+
				comment.get('address') +
				'</p>'+
				'</div>'+
				'</div>';

				var infowindow = new google.maps.InfoWindow({
					content: contentString
				});

				// add the comment to the map
				var marker = new google.maps.Marker({
					position: new google.maps.LatLng(comment.get("Location").latitude, comment.get("Location").longitude),
					map: map,
					title: 'Comment'
				});

				// add the popup
				google.maps.event.addListener(marker, 'click', function() {
					infowindow.open(map,marker);
				});
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
			_.bindAll(this, "addAll");
			this.Photos = new PhotoList;
			this.Photos.query = new Parse.Query(Photo);
			this.Photos.query.equalTo("Visit", {"__type":"Pointer","className":"Visit","objectId": this.model.id});
			this.Photos.query.limit(1000);
			this.Photos.query.ascending("createdAt");
			this.Photos.bind('add',     this.addOnePhoto);
			this.Photos.bind('reset',   this.addAll);
			this.Photos.bind('all',     this.render);
			this.Photos.comparator = function(photo){
				return photo.createdAt;
			}
			this.Photos.fetch();

		},
		addAll: function(collection1){
			var collection2 = this.options.comments;
			if(collection1.length+collection2.length == 0){
				// hack in a 'yo, homes we don't got no comments'
				// legitimately, this sucks and is horrible and should be in a view.
				$('#logitem-list').append('<li id="no-comments" class="visitComment">&laquo; No comments were made on this visit &raquo;</li>');
			}
			/* DE-IMBECILE collections. seriously, how hard is it to *actually* 
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
	var mainView = new MainView;

	var AppRouter = Parse.Router.extend({
		routes: {
			"visits": "visitPage",
			"admin": "adminPanel",
			"*actions": "visitPage" // Backbone will try match the route above first
		}
	});

	// Instantiate the router
	var app_router = new AppRouter;
	app_router.on('route:visitPage', function () {
		new VisitViewerView();
		mainView.dashboard.highlight("visits");
	});

	app_router.on('route:adminPanel', function () {
		new AdminView();
		mainView.dashboard.highlight("admin");
	});

	// Start history a necessary step for bookmarkable URL's
	Parse.history.start(); 
});





