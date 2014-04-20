rfkonline
=========

The website for the RFK director panel


#Code snippets not belonging in the codebase:

## To add an existing user to a role (not currently supported through the parse data browser)
(right now it adds Rich to the director role)
    
    var directorRoleQuery = new Parse.Query(Role);
    directorRoleQuery.equalTo("name", "Director");
    directorRoleQuery.first({
      success: function(role) {
        var relation = role.relation("users");
        var userQuery = new Parse.Query(User);
			  userQuery.equalTo("username", "rsshull");
			  userQuery.first({
			    success: function(user) {
			      relation.add(user)
			      role.save();
			    }
			  });
			}
    });
