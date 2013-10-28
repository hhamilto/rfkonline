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
		return max
	}
}

function minTally(init){
	var max = init;
	return function(n){
		if(n<max)
			max = n;
		return max
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
    console.log("areaWidth: " + areaWidth);
    var widthRatio = 256/mapWidth;
    var adjustedWidth = areaWidth * widthRatio;
    return Math.floor(-Math.log(adjustedWidth/360)/
        Math.log(2));
}