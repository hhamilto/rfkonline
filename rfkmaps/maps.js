
Parse.initialize("5vJjW6VAiJdfBqyIEGgenZEip26b2NC5aZdVrC9A", "cZbPecnNrzpf6NQkbwR09akfcZsfbH19Ps5hUBgf");

var map;

var TravelPoint = Parse.Object.extend("TravelPoint");
var query = new Parse.Query(TravelPoint);
query.equalTo("VisitId", "ESvBffMJi7");
query.find({
    success: function(travelPoints) {
        var mapOptions = {
            zoom: 15,
            center: new google.maps.LatLng(37.33018889, -122.0258605),
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById('mapCanvas'),
                mapOptions);
        var visitRoutePoints = [];
        travelPoints.map(function(travelPoint){
                visitRoutePoints.push( new google.maps.LatLng(travelPoint.attributes.Location.latitude, travelPoint.attributes.Location.longitude));
                console.log(travelPoint.attributes.Location.latitude + ", " + travelPoint.attributes.Location.longitude);
        });
        var visitRoute = new google.maps.Polyline({
            path: visitRoutePoints,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        visitRoute.setMap(map)
        
    },
    error: function(object, error) {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and description.
        console.log("o"+object);
        console.log("e"+error);
    }
});






