jQuery.fn.shake = function(intShakes, intDistance, intDuration) {
	this.each(function() {
		$(this).css("position","relative"); 
		for (var x=1; x<=intShakes; x++) {
		$(this).animate({left:(intDistance*-1)}, (((intDuration/intShakes)/4)))
	.animate({left:intDistance}, ((intDuration/intShakes)/2))
	.animate({left:0}, (((intDuration/intShakes)/4)));
	}
  });
return this;
};

function maxTally(init){
	var max = init;
	return function(n){
		if(n>max)
			max = n;
		return max;
	}
}

function minTally(init){
	var min = init;
	return function(n){
		if(n<min)
			min = n;
		return min;
	}
}

function Average() {
	var items = [];
	return {
		  tally: function(e){items.push(e);console.log(typeof e)},
		 get: function(){tot = 0; items.map(function(e){tot+=e}); return tot/items.length;}
	}
};

function getZoomFromDegreeWidth(areaWidth, mapWidth){
	var widthRatio = 256/mapWidth;
	var adjustedWidth = areaWidth * widthRatio;
	return Math.floor(-Math.log(adjustedWidth/360)/
		Math.log(2));
}

//collection must be an array
function getKidListString(collection, attribute){
	return collection.reduce(function(previousValue, currentValue, i, arr){
		return  i == 0?             previousValue += currentValue.get(attribute):
				i == arr.length -1? previousValue += "</b> and <b>" + currentValue.get(attribute):
									previousValue += ", " + currentValue.get(attribute);
	},"<b>") + "</b>";
}

function latch(n, self, callback , args){
	args = args || [];
	var count = 0;
	if(count == n)
		callback.apply(self, args);
	return function(arg){
		args.push(arg);
		count++;
		if(count == n)
			callback.apply(self, args);
	};
}

function getSafely(def){
	var retVal = arguments[1];
	for(var i = 2; i < arguments.length; i++){
		var temp = retVal[arguments[i]];
		if(temp == undefined)
			return def;
		retVal = temp;
	}
	return retVal;
}

function addUserToRole(user, role){
	var roleQuery = new Parse.Query(Parse.Role);
	roleQuery.equalTo("name", role);
	roleQuery.find({
		success: function(role){
			var query = new Parse.Query(Parse.User);
			query.equalTo("username", user); 
			query.find({
				success: function(director) {
					role[0].getUsers().add(director[0]);
					role[0].save();
				}
			});
		}
	});
}