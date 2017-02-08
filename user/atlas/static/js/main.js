
(function() {

	// shim layer with setTimeout fallback
    var lastTime = 0,
        vendors = ['ms', 'moz', 'webkit', 'o'],
        x,
        length,
        currTime,
        timeToCall;

    for(x = 0, length = vendors.length; x < length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = 
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            currTime = new Date().getTime();
            timeToCall = Math.max(0, 16 - (currTime - lastTime));
            lastTime = currTime + timeToCall;
            return window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

$(document).ready(function() {

	/* global variables */
	var filterOpen = false;
	var tileSize = 222; // accounting for padding and border
	var hoverContainerPadding = 35;
	var isStamped = false;
	var filterCount = 0;
	var tileCount = 0;
	var sortsOpen = false;
	var breadcrumbs = [];
	var container;
	var stampElem;
	var availableTags = [];
	var availableTagsExtCo = [];
	var availableTagsPI = [];
	var availableTagsPeptideMw = [];
	var sortByValue = "amgNumber";
	var allQueries = [];
	var filters = [];
	var detailOpen = false;
	var searchReturnTiles = [];
	var searchSubset = "search-all";
	var gridView = true;
	var graphMenuOpen = false;
	var extData = [];
	var piData = [];
	var phData = [];
	var mwData = [];
	var amgNumbers = [];
	var mIndex = [];
	var selectX = "Extinct Coeff";
	var selectY = "PI";
	var	margin = 70;
	var w = window;
	var d = document;
	var e = d.documentElement;
	var g = d.getElementsByTagName('body')[0];
	var x = w.innerWidth || e.clientWidth || g.clientWidth;
	var y = w.innerHeight || e.clientHeight || g.clientHeight;
	var width = x - 250 - margin;
	var height = y - 50 - margin;
	var vis; // d3 container
	var gridOffset = { "x" : 40, "y": 129 };
	var graphOffset = { "x" : 180, "y": 20 };
	var iconOffset = { "x": 19, "y": 15 };
	var sampleData = [];
	var iconClicked = false; // used for preventing untimely click events when switching views
	var overlayOn = false;
	var inSearchResults = false;
	var chosenFromAutosuggest = false;
	var isOpen = $( ".ui-dialog" ).dialog( "isOpen" );
	var isOpenSorbitol = $( ".ui-dialog-sorbitol" ).dialog( "isOpen" );
	var isTransitioning = false;


// When switching to Graph view from Grid view, run animLoop so the icons of molecules will match to d3 chart points
	(function animloop(){
	  requestAnimFrame(animloop);

	  if (!gridView && tileCount > 1) {
	  	// code for matching divs to circles in graph goes here!
	  	positionTilesInGraph();	  	
	  } else if (!gridView && tileCount == 1){
	  	$(".tile:visible").css({
			"left": (width/2 + 97) + "px",
			"top": (height/2 + 20) + "px"
		});
	  }
	})();


	function positionTilesInGraph() {// code for matching divs to circles in graph goes here!
		$("circle").each(function() {
	  		var circleX = Number($(this).attr("cx")) + graphOffset.x; // <-- graph offset
	  		var circleY = Number($(this).attr("cy")) + graphOffset.y; // <-- graph offset
	  		var circleDX = $(this).attr("dx"); 
	  		var circleDY = $(this).attr("dy");
	  		var tileId = $(this).attr("id");
	  		$("#" + tileId)
	  			.css("left", (circleX) + "px")
	  			.css("top", (circleY) + "px")
	  			.attr("dx", circleDX)
	  			.attr("dy", circleDY);
	  	});
	}

	/* =============== */
	/* Event Listeners */
	/* =============== */

	function attachEvents() {
		
		/* tiles */

			$(".tile").mouseenter(function() {
				if (isTransitioning) return;
				
				if (gridView) {

					var index = $(this).attr('index');
					var object = data[index];

					if (!isStamped) { // if detail view isn't open
						$(this).addClass("hover");
						$("#hover-container").show();
						updateHover(object);
					}

					// get current object position
					var tileX = $(this).position().left;
					var tileY = $(this).position().top;
					var offsetX = tileX - tileSize;
					var offsetY = tileY + tileSize;
					var notchOffsetX = 282;

					var numCols = getCols();
					var tileObject = this;

					// get sort index
					var sortIndex = -1;
					var sortedItems = container.data('isotope').filteredItems;
					$.each(sortedItems, function(i, el){
						if ($(tileObject).attr("id") == el.element.id) {
							sortIndex = i;
						}
					});
					// find tile index by first finding where it is arranged on the grid
					var row = Math.floor(sortIndex / numCols);
					var tileIndexRow = Math.floor(sortIndex - numCols * row);

					if (tileIndexRow > numCols - 2) {
						offsetX = offsetX - tileSize;
						notchOffsetX = 538 - hoverContainerPadding; // 35 is padding of the hover container
					} else if (tileIndexRow == 0) {
						offsetX = offsetX + tileSize;
						notchOffsetX = 95 - hoverContainerPadding; // 35 is padding of the hover container
					}

					// hover container position
					var windowPos = $(document).scrollTop() + 237; // 200

					// position hover container depending on whether it is below or above fold, or on the edge columns
					if (tileY > windowPos) {
						$(".hover-notch").hide();
						$(".hover-notch-bottom").show();
						$(".hover-notch-bottom").css("margin-left", notchOffsetX);
						$("#molecule-name").css("margin-top", "-27px");
						$("#meta-container-hover").css("margin-top", "-27px");

						if (row >= 2) {
							var rowMultiplier = (row - 2);
							var spaceTop = (rowMultiplier * 222); // original 185

							$("#hover-container").css("margin-top", spaceTop);
						}
					} else {
						$("#molecule-name").css("margin-top", "0");
						$("#meta-container-hover").css("margin-top", "0");
						$(".hover-notch-bottom").hide();
						$(".hover-notch").show();
						$(".hover-notch").css("margin-left", notchOffsetX);
						$("#hover-container").css("margin-top", offsetY - 1);
					}
					$("#hover-container").css("margin-left", offsetX);

					// notch position
				} 	else if (!gridView) {
					$(".tile").css("opacity", .3)
					$(this).addClass("smallHover").css("opacity", 1);
					$("#tooltip").css("visibility", "visible");
				}
			});

			$(".tile").mouseleave(function() {
				if (gridView) {
					$(this).removeClass("hover");
					$("#hover-container").hide();
				} else if (!gridView) {
					$(this).removeClass("smallHover");
					$(".tile").css("opacity", 1);
					$("#tooltip").css("visibility", "hidden");
				}
			});


			$(".tile").mousemove(function() {
				if (isTransitioning) return;

				if (!gridView) {
					// Display hover tooltip on Graph view
					$("#tooltip").css("visibility", "visible")
						.css("top", (event.clientY - 60)  + "px")
						.css("left", event.clientX +"px")
						.html("<span class='tooltipXY'>" + $(this).attr("dx") + ", " + $(this).attr("dy") + "</span>" + "<br>" + "<span class='tooltipName'>" + $(this).attr("molecule_name") + "</span>");
				} 
			});

			$(".tile").click(function() {

				if (isTransitioning) return;

				var stampedTile;
				var index = $(this).attr('index');
				var object = data[index];
				var tile = $(this);

				if (gridView){
					var tileY = tile.css('top');
					var tileH = tile.css('height');
					$('.stamp').css('top', parseInt(tileY) + parseInt(tileH) + 42 + "px");
					tile.addClass('selected');

					if ( isStamped ) {	// isStamped (basically: is detail view open?)
						closeDetail(tile);
					} else if (!isStamped) {
						showDetail(object);
						positionNotch(tile);
						if(filterOpen){
							menuBehave();
						}
						stampedTile = $(this);
						$(".tile, #grid-header").css("opacity", ".3");
						$(this).css("opacity", "1");
					}
					updateIso();
				} else if (!gridView) {
					if(filterOpen){
						menuBehave(); // closes side menu if detail view is opened 
					}
					$(this).removeClass("smallHover");
					showDetail(object);
					$("#hover-notch").hide();
					$("#footer").show();
					$(".tile, #grid-header").css("opacity", ".3").addClass("shadow");
				}

			});

		/* Overlay click handlers */

		$("#infoButton").click(function() {
			if (isTransitioning) return;

			$( "#dialog" ).dialog({
				modal: true,
				stack: false,
			  	maxHeight: 600,
			  	minHeight: 400,
			  	minWidth: 750,
				show: { effect: "fadeIn", duration: 250 },
		  		hide: { effect: "fadeOut", duration: 250 },
			}); 
		});

		$(".email").mouseenter(function(){
			$(this).attr("src", "/static/img/emailicon-hover.png");
		});

		$(".email").mouseleave(function(){
			$(this).attr("src", "/static/img/emailicon.png");
		});

 
		/* detail view */

		$("#detailexit").click(function() {
			if (isTransitioning) return;

			closeDetail();
		});

		// if esc is pressed, close the detail view

		$(document).keyup(function(e) {
			if (isTransitioning) return;

  			if (e.keyCode == 27) {
	  			closeDetail();   // esc
	  			if (overlayOn) {
	  				closeOverlay();
	  			}
  			}
		});

		//snap to links within detail view
		$("a").click(function( event ) {
			if (isTransitioning) return;

			if ( $(this).attr("href").match("#") ) {
				event.preventDefault();
				var href = $(this).attr('href').replace('#', '')
				scrollToAnchor( href );

			}
		});

		$("#grid-header").click(function(){
			if (isTransitioning) return;

			if (isStamped == true) {
				$('.tile').removeClass('selected');
				closeDetail();
				updateIso();
			}
		});


		/* clear breadcrumb */
		$("#clear-filters").click(function() {
			if (isTransitioning) return;

			clearFilters();
		});

		/* filters */

		// opening and closing the menu
		$(".nav-trigger").click(function() {
			if (isTransitioning) return;

			menuBehave();
		});

		// opening and closing the filters categories
		$(".filter-category").click(function() {
			$(this).siblings().animate({
				height:'toggle'
			});
		});

		$(".filter").click(function() {
	    	var selector = $(this).attr('data-filter');

			if ($(this).hasClass('selected')) {
				$(this).removeClass("selected");
				updateSelectors(selector, false);
			} else {
				$(this).addClass("selected");
				updateSelectors(selector, true);
			}
			countFilters($(this).parent());
		});

		/* sorts */

		$(".sortby-label, .sortby-item_selected").click(function() {
			if (sortsOpen == false) {
				$(".sortby-item").show();
				sortsOpen = true;
			} else if (sortsOpen == true){
				$(".sortby-item").hide();
				sortsOpen = false;
			}
		});

		$(".sortby-item").click(function() {
			sortByValue = $(this).attr('data-sort-by');
			container.isotope({ 
				sortBy: [sortByValue, 'amgNumber'],
			});
			var sortBy = $(this).text();
			$("#sortby-item_selected").text(sortBy);
			$(".sortby-item").removeClass("selected");
			$(this).addClass("selected");
			$(".sortby-item").hide();
			sortsOpen = false;

			// update the view
			updateIso();
		});

		$("#sort-container").mouseleave(function() {
			$(".sortby-item").hide();
			sortsOpen = false;
		});

		// switch order toggle
		$("#switch-order-button").click(function(){
			if (isTransitioning) return;
			
			startTransition();

			if($(this).hasClass("ascending")){
				$(this).removeClass("ascending");
				$(this).addClass("descending");
				container.isotope({ sortBy: sortByValue, sortAscending : false }).isotope();
				container.isotope('updateSortData').isotope();
			} else if ($(this).hasClass("descending")){
				$(this).removeClass("descending");
				$(this).addClass("ascending");
				container.isotope({ sortBy: sortByValue, sortAscending : true }).isotope();
				container.isotope('updateSortData').isotope();
			}
		});

		/* search dropdown */

		//search dropdown options
		$("#search-carrot").click(function(){
			$(".search-item").toggle();
		});

		$("#search-dropdown").mouseleave(function() {
			$( "#search" ).autocomplete( "close" );
			$(".search-item").toggle();
		});

		$(".search-item").click(function(){
			// clear selection
			$(".search-item").removeClass("selected");
			// add selection to selected item
			$(this).addClass("selected");
			searchSubset = $(this).attr("id");
			setAutocompleteMenu(searchSubset);
			$(".search-item").toggle();
		});

		// dynamic search, don't wait for keydown
		$("#search").keyup(function(e){
			runSearch();
			if (e.keyCode == 13) {
				$( "#search" ).autocomplete( "close" );
			}
		});

		$(".ui-autocomplete").click(function(){
			runSearch();
			setTimeout(function(){
				if(tileCount == 1){
					ifOneResult();
				}
			}, 500);
		});

		/* graph Menu */

		$(".graphMenu-item.x").click(function(){
			$(".graphMenu-item.x").removeClass("selected");
			$(this).addClass("selected");
			$(".graphMenu-item").hide();
			$("#x-label").text($(this).text());
			selectX = $("#x-label").text();
			updateGraph();
		});

		$(".graphMenu-item.y").click(function(){
			$(".graphMenu-item.y").removeClass("selected");
			$(this).addClass("selected");
			$(".graphMenu-item").hide();
			$("#y-label").text($(this).text());
			selectY = $("#y-label").text();
			updateGraph();
		});

		$(".graphMenu").click(function(){
			if (graphMenuOpen == false) {
				$(".grid").css("z-index", "0");
				$(this).children(".menu-container").children(".graphMenu-item").show();
				$("#graph-wrapper").css("z-index", "50000");
				graphMenuOpen = true;
			} else if (graphMenuOpen == true){
				$(this).children(".menu-container").children(".graphMenu-item").hide();
				graphMenuOpen = false;
				$("#graph-wrapper").css("z-index", "-30");
				$(".grid").css("z-index", "0");
			}
		});

		$(".graphMenu").mouseleave(function(){
				$(".graphMenu-item").hide();
				graphMenuOpen = false;
				$("#graph-wrapper").css("z-index", "-30");
				$(".grid").css("z-index", "0");
		});

		/* switch between graph and grid views */

		$("#graphIcon").click(function() {
			if (iconClicked == true || $(this).hasClass('graphOn')) {
				return;
			}
			iconClicked = true;

			// adjust view
			$("#gridIcon").removeClass("gridOn").addClass("gridOff");
			$("#graphIcon").addClass("graphOn").removeClass("graphOff");
			$("#footer").hide();
			$("#switch-order-button").fadeOut();
			$("#sortby-menu").fadeOut();
			$(".tile .tile_name").hide();

			// store the x y positions of tiles
			$(".tile").each(function() {
				var left = parseInt($(this).css("left"));
				var top = parseInt($(this).css("top"));
				$(this).attr("left-orig", left);
				$(this).attr("top-orig", top);
			});

			// destroy isotope (this will remove tile positions)
			$('.grid').isotope('destroy');

			// reposition tiles
			$(".tile").each(function() {
				var left = Number($(this).attr("left-orig")) + gridOffset.x + iconOffset.x; 
				var top = Number($(this).attr("top-orig")) + gridOffset.y + iconOffset.y;
				$(this).css("left", left + "px");
				$(this).css("top", top + "px");
			});
			$(".tile_icon").addClass("graphMargins");

			/*
			setTimeout(function() {
				$(".tile").addClass("tileTransform");	//scale tiles to small size
				$(".tile_icon").addClass("iconScale");
				positionTilesInGraph();
				
				setTimeout(function() {
					$("#graph-wrapper").fadeIn(); //fade in graph
					gridView = false;
					iconClicked = false
				}, 1000);
			}, 0);
			*/
			updateGraph();
			$(".tile").addClass("tileTransform");	//scale tiles to small size
			$(".tile_icon").addClass("iconScale");
			positionTilesInGraph();
			$("#graph-wrapper").fadeIn(); //fade in graph
			gridView = false;
			iconClicked = false
			displayQueries();
		});

		$("#gridIcon").click(function(){
			if (iconClicked == true || $(this).hasClass('gridOn')) {
				return;
			}
			iconClicked = true;

			// adjust view
			$("#gridIcon").removeClass("gridOff").addClass("gridOn");
			$("#graphIcon").addClass("graphOff").removeClass("graphOn");
			$("#switch-order-button").fadeIn();
			$("#sortby-menu").fadeIn();
			$("#graph-wrapper").hide();
			gridView = true;

			// scale tiles back up
			
			// reposition tiles in grid
			$(".tile").each(function() {
				var left = Number($(this).attr("left-orig")) + gridOffset.x + iconOffset.x;
				var top = Number($(this).attr("top-orig")) + gridOffset.y + iconOffset.y;
				$(this).css("left", left + "px");
				$(this).css("top", top + "px");
			});
			$(".tile_icon").removeClass("iconScale");
			$(".tile").removeClass("tileTransform");
			$(".tile .tile_name").fadeIn();
			$(".tile_icon").removeClass("graphMargins");

			container = $('.grid').isotope({
					layoutMode: 'packery',
					itemSelector: '.tile',
					getSortData: {
						amgNumber: '[molecule_name]',
						dateFormed: '[pst_raw]'
				    },
				    transitionDuration: 0
				});

			// transition handler
			container.isotope("on", "layoutComplete", function() {
				stopTransition();
			});

			stampElem = container.find('.stamp');
			displayQueries();
			updateGraph();

			$("#footer").show();
			iconClicked = false
			container.isotope({transitionDuration: '0.4s'});

			/*
			// execute when each() has finished
			setTimeout(function() {
				$(".tile").removeClass("tileTransform");
				$(".tile .tile_name").fadeIn();
				$(".tile_icon").removeClass("graphMargins");

				// turn isotope back on
				container = $('.grid').isotope({
					layoutMode: 'packery',
					itemSelector: '.tile',
					getSortData: {
						amgNumber: '[molecule_name]',
						dateFormed: '[pst_raw]'
				    }
				});
				stampElem = container.find('.stamp');	
				updateIso();

				$("#footer").show();
				iconClicked = false
			}, 1000);
			*/
		});

	} // end of event listeners


	/* ============== */
	/* View Functions */
	/* ============== */

	function initView(data) {

		var autocompleteList = [];
		var autocompleteListExtCo = [];
		var autocompleteListPI = [];
		var autocompleteListPeptideMw = [];

		for (var i = 0; i < data.length; i++) {

			// build tiles
			var tile = $("<div id='molecule"+i+"' class='"+data[i].allfilters+"' index='"+i+"' molecule_name='"+data[i].molecule_name+"' pst_raw='"+data[i].pstraw+"'></div>");
			var image = $("<img class='tile_icon' src='/static/img/"+data[i].tile_icon+"'/>");
			var name = $("<div class='tile_name'>"+data[i].molecule_name+"</div>");
			tile.append(image, name);
			$('.grid').append(tile);

			// build autocomplete menu
			if (data[i].molecule_name != "") {
				autocompleteList.push(data[i].molecule_name);
			}
			if (data[i].alternate_names != "") {
				autocompleteList.push(data[i].alternate_names);
			}
			if (data[i].pstformed != "") {
				autocompleteList.push(data[i].pstformed);
			}
			if (data[i].class1 != "") {
				autocompleteList.push(data[i].class1);
			}
			if (data[i].class2 != "") {
				autocompleteList.push(data[i].class2);
			}
			if (data[i].modality != "") {
				autocompleteList.push(data[i].modality);
			}
			if (data[i].extinctioncoeff != "") {
				autocompleteList.push(data[i].extinctioncoeff);
				autocompleteListExtCo.push(data[i].extinctioncoeff);
			}
			if (data[i].peptidemw != "") {
				autocompleteList.push(data[i].peptidemw);
				autocompleteListPeptideMw.push(data[i].peptidemw);
			}
			if (data[i].pi != "") {
				autocompleteList.push(data[i].pi);
				autocompleteListPI.push(data[i].extinctioncoeff);
			}

			// build data arrays
			extData.push(Number(data[i].extinctioncoeff));
			piData.push(Number(data[i].pi));
			phData.push(Number(data[i].formulation_pH));
			var peptidemwTemp = parseFloat((data[i].peptidemw).replace(/,/g, ''));
			mwData.push(Number(peptidemwTemp));
			amgNumbers.push(data[i].molecule_name);
			mIndex.push("molecule" + i);
			sampleData.push({"x": 0, "y": 0, "amg": 0});
	    }

	    // eliminate dupes from autocomplete menu
		$.each(autocompleteList, function(i, el){
		    if($.inArray(el, availableTags) === -1) {
		    	availableTags.push(el);
		    }
		});

		$.each(autocompleteListExtCo, function(i, el){
		    if($.inArray(el, availableTagsExtCo) === -1) {
		    	availableTagsExtCo.push(el);
		    }
		});

		$.each(autocompleteListPeptideMw, function(i, el){
		    if($.inArray(el, availableTagsPeptideMw) === -1) {
		    	availableTagsPeptideMw.push(el);
		    }
		});

		$.each(autocompleteListPI, function(i, el){
		    if($.inArray(el, availableTagsPI) === -1) {
		    	availableTagsPI.push(el);
		    }
		});

		$("#search").attr("placeholder", "Search all fields");
		availableTags.sort();
		availableTagsExtCo.sort();
		availableTagsPeptideMw.sort();
		availableTagsPI.sort();


		// initialize isotope
		container = $('.grid').isotope({
			layoutMode: 'packery',
			itemSelector: '.tile',
			getSortData: {
				amgNumber: '[molecule_name]',
				dateFormed: '[pst_raw]',
		    }
		});
		// transition handler
		container.isotope("on", "layoutComplete", function() {
			stopTransition();
		});

		stampElem = container.find('.stamp'); // isotope stamp element

		// count tiles & displaying number in header
		countTiles();


		// search autocomplete
		$( "#search" ).autocomplete({
	      source: availableTags
	    });

		// attach event listeners
		attachEvents();
		container.isotope({ 
			sortBy: [sortByValue, 'amgNumber'],
			sortAscending : true
		});
		updateIso();

	}
	// if a json field is empty, replace with default message
	function replaceEmpties(object) {
		for (var prop in object) {
			if (object[prop] == "") {
				if ( (prop != "class2")
				&& (prop != "bioassayLink") 
				&& (prop != "idelisaLink")
				&& (prop != "chargeassayLink")
				&& (prop != "secLink")
				&& (prop != "rcesdsLink")
				&& (prop != "titerLink")
				&& (prop != "chopelisaLink")
				&& (prop != "proaelisaLink") ) {
					object[prop] = "NA at publication";
				}
			}
		};
	}

	function closeOverlay() {
		overlayOn = false;
	}

	// pass the "typing" search query to be checked agains the list
	function runSearch(){
		if(!detailOpen){			
			var searchString = $("#search").val();
			trySearch(searchString, searchSubset);
			inSearchResults = true;
		} 
	}

	//find molecules to display based on search
	function trySearch(searchString, filter) {

		// reset search array
		searchReturnTiles = [];
		$(".tile").removeClass("showSearch");

		if(searchString != ""){
			/* check search query against JSON for matches */
			for (var i = 0; i < data.length; i++) {
				if (filter == "search-all") {
					// remove spaces from name
					nameNoSpace = data[i].molecule_name.replace(/\s+/g, '');

					// look for query in JSON
					if (
					    (data[i].molecule_name.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (nameNoSpace.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (data[i].alternate_names.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (data[i].pstformed.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (data[i].class1.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (data[i].class2.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (data[i].modality.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (data[i].extinctioncoeff.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (data[i].peptidemw.toLowerCase().indexOf(searchString.toLowerCase()) != -1) ||
					    (data[i].pi.toLowerCase().indexOf(searchString.toLowerCase()) != -1) 
					   ) 
					{
						searchReturnTiles.push("#molecule"+i);
						$("#molecule"+i).addClass("showSearch");
					}

				}

				if (filter == "search-pi") {			
					if (data[i].pi.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
						searchReturnTiles.push("#molecule"+i);
						$("#molecule"+i).addClass("showSearch");
					}
				}
				if (filter == "search-ext") {
					if (data[i].extinctioncoeff.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
						searchReturnTiles.push("#molecule"+i);
						$("#molecule"+i).addClass("showSearch");
					}
				}
				if (filter == "search-pept") {
					if (data[i].peptidemw.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
						searchReturnTiles.push("#molecule"+i);
						$("#molecule"+i).addClass("showSearch");
					}
				}
			}
		} else {
			searchReturnTiles = [];
		}
		updateBreadcrumb();
	}

	//find filters
	function updateSelectors(clickedFilter, isAdd){
		if(clickedFilter != ""){
			if (isAdd == true){
				filters.push(clickedFilter);
			} 
			else {
				for (var i = 0; i < filters.length; i++) {
					if (clickedFilter == filters[i]) {
						var index = filters.indexOf(filters[i]);
						filters.splice(index, 1);
					} 
				};	
			} 			
		} else {
			filters = [];
		}
		updateBreadcrumb();
	}

	function updateBreadcrumb() { 

		allQueries = []; //merge filter and search queries
		var breadcrumbText = "";

		if(filters.length > 0){
			for (var i = 0; i < filters.length; i++){ //filters are active filters selections\
				var filterNoDot = filters[i].replace(".", "");
				var filterString = $("#" + filterNoDot).text();
				allQueries.push(filters[i]);
				if (i == filters.length - 1){
					breadcrumbText = breadcrumbText + filterString;
				} else {
					breadcrumbText = breadcrumbText + filterString + ", ";
				}
			}
		}

		var searchString = $("#search").val();
		if (searchString && allQueries != 0) {
			breadcrumbText = breadcrumbText + ", " + searchString;
		} else {
			breadcrumbText = breadcrumbText + searchString;
		}

		if (searchString != ""){ //searchReturnTiles is the molecules that are searched 
			allQueries.push(".showSearch");
		}
		
		//display narrowed set of molecules
		displayQueries();

		//update number of visible tiles
		countTiles();

		if (tileCount > 0){
			if (searchString == "" && filters.length == 0){
				$("#breadcrumb-text").text("All molecules");
				$("#clear-filters").css('visibility', 'hidden');
				$("#breadcrumb-text").css("color", "black");
			} else {
				$("#breadcrumb-text").text(breadcrumbText); //update display of breadcrumb
				$("#clear-filters").css('visibility', 'visible');
				$("#breadcrumb-text").css("color", "black");
			}
		} else {
			$("#breadcrumb-text").text('Your query "' + breadcrumbText + '" found no results' );
			$("#breadcrumb-text").css("color", "#777777");
		}

	}

	function displayQueries() {

		//display narrowed set of molecules
		if (allQueries.length > 0){
			if (gridView) {
				container.isotope({ filter: allQueries.join("") });
				updateIso();
			} else {
				$(".tile"+allQueries.join("")).show();
				$(".tile:not("+allQueries.join("")+")").hide()
				if ($(".tile"+allQueries.join("")).length != 1){
					updateGraph();
				} else {
					updateGraph();
					$(".tile"+allQueries.join("")).css({
						"left": (width/2 + 97) + "px",
						"top": (height/2 + 20) + "px"
					});
				}
			}
		} else {
			if (gridView) {
				container.isotope({ filter: "*" });
				updateIso();
			} else {
				$(".tile").show();
				updateGraph();
			}
		}
	}

// count number of selected filters and update the header
	function countFilters(parent){
		var filterCount = $(parent.find(".filter.selected")).length;
		if(filterCount==0){
			var header = parent.prev().removeClass('selected').find('.filter-count').text('');
		} else {
			var header = parent.prev().addClass('selected').find('.filter-count').text(' (' + filterCount + ')');
		}
	}

// return to "all visible"
	function clearFilters(){
		if(!isStamped) {
			$("#search").val("");
			updateSelectors("", false);
			updateBreadcrumb();
			$(".filter.selected").removeClass("selected");
			$(".filter-category.selected").removeClass("selected");	
			$(".filter-count").text("");
			$('#clear-filters').css('visibility', 'hidden');
			$("#breadcrumb-text").css("color", "black");
		}
		inSearchResults = false;
	}


	function setAutocompleteMenu(filter) {
		$( "#search" ).autocomplete( "destroy" );

		if (filter == "search-pi") {
			$("#search").attr("placeholder", "Search PI");	
			// sets the autocomplete menu to PI tags
			$( "#search" ).autocomplete({
				source: availableTagsPI
			});
		}
		if (filter == "search-ext") {
			$("#search").attr("placeholder", "Search Ext. Coeff.");
			// sets the autocomplete menu to ExtinctionCoefficient tags
			$( "#search" ).autocomplete({
				source: availableTagsExtCo
			});
		}
		if (filter == "search-pept") {
			$("#search").attr("placeholder", "Search Peptide Mw");
			// sets the autocomplete menu to PeptideMW tags
			$( "#search" ).autocomplete({
				source: availableTagsPeptideMw
			});
		}
		if (filter == "search-all") {
			$("#search").attr("placeholder", "Search all fields");
			// sets the autocomplete menu to all available tags
			$( "#search" ).autocomplete({
				source: availableTags
			});
		}
	}

	// if only one result is returned for search, automatically open the detail view
	function ifOneResult () {
		if (gridView) {
			var onlyTile = $(".tile:visible");
			var index = onlyTile.attr('index');
			var object = data[index];
			if(filterOpen){
				menuBehave();
			}
			showDetail(object, true);
			positionNotch(onlyTile, true);			
		}
	}
	// find position of tile 
	function getCols() {
		var gridWidth = $(".grid").width();
		var numCols = Math.floor(gridWidth / tileSize);
		return numCols;
	}
	// updates isotope layout
	function updateIso() {
		startTransition();
		container.isotope('layout');
	}
	// showDetail opens the detail view, and passes in a tile object & boolean whether it is the only tile in search return
	function showDetail(object, isJustOne) {
		detailOpen = true;
		isStamped = true;
		var isJustOne = isJustOne || false;

		if(!gridView) {
			$('.stamp').css("top", "-10px").css("padding-top", "0px").fadeIn();
		} 
		$('#detailview_header').fadeIn();

		if (gridView) {
			if (isJustOne) {
				$('.stamp').css("top", "222px").fadeIn();
			} else {
				$('.stamp').fadeIn();
			}
			container.isotope( 'stamp', stampElem );				
		}

		if (object.heavychain_image == "%$*#"){
			$("#hc_image").hide();
		} else {
			$("#hc_image").attr("src", "/static/img/" + object.heavychain_image).show();
		}
		if (object.lightchain_image == "%$*#") {
			$("#lc_image").hide();
		} else {
			$("#lc_image").attr("src", "/static/img/" + object.lightchain_image).show();
		}
		if (object.sequence_legend == "%$*#") {
			$("#sequence_legend").hide();
		} else {
			$("#sequence_legend").attr("src", "/static/img/" + object.sequence_legend).show();
		}
		if (object.heavychain == "%$*#") {
			$("#copyHC").hide();
		} else {
			$("#heavychainfield").attr("value", object.heavychain);
			$("#copyHC").show();
		}
		if (object.lightchain == "%$*#") {
			$("#copyLC").hide();
		} else { 
			$("#lightchainfield").attr("value", object.lightchain);
			$("#copyLC").show();
		}

		replaceEmpties(object);

		// populate meta fields
		$("#detail-molecule-illustration img").attr("src", "/static/img/" + object.molecule_illustration);
		$("#detail-molecule-name").text(object.molecule_name);
		$("#detail-alternate-names").text(object.alternate_names);
		$("#detail-pstformed").text(object.pstformed);
		$("#detail-class1").text(object.class1);
		$("#detail-class2").text(object.class2);
		$("#detail-modality").text(object.modality);
		$("#detail-extinctioncoeff").text(object.extinctioncoeff);
		$("#detail-peptidemw").text(object.peptidemw);
		$("#detail-pi").text(object.pi);

		// populate detailed fields
		$("#summary-text").text(object.summary_text);
		$("#formulation-text").text(object.formulation_text);
		$("#target-text").text(object.target_text);
		$("#therapeuticindications-text").text(object.therapeuticindications_text);
		$("#status-text").text(object.status_text);
		$("#stage-text").text(object.stage_text);

		if( (object.bioassay[0] != "") && (object.bioassayLink[0] != "") ){
			$("#bioassayNm").text("");
			if(object.bioassay.length > 1){
				var link = $('<a target="_blank" class="methodLink" href="'+object.bioassayLink[0]+'" id="bioassay1">'+object.bioassay[0]+'</a><span> and </span><a target="_blank" class="methodLink" href="'+object.bioassayLink[1]+'" id="bioassay2">'+object.bioassay[1]+'</a>');
				$("#bioassayNm").append(link);
			} else {
				var link = $('<a target="_blank" class="methodLink" href="'+object.bioassayLink[0]+'" id="bioassay">'+object.bioassay[0]+'</a>');
				$("#bioassayNm").append(link);
			}
		} else {
			$("#bioassayNm").text(object.bioassay);
		}

		if( (object.idelisa != "") && (object.idelisaLink != "") ){
			$("#idelisaNm").text("");
			var link = $('<a target="_blank" class="methodLink" href="'+object.idelisaLink+'" id="idelisa">'+object.idelisa+'</a>');
			$("#idelisaNm").append(link);
		} else {
			$("#idelisaNm").text(object.idelisa);
		}

		if( (object.chargeassay != "") && (object.chargeassayLink != "") ){
			$("#chargeassayNm").text("");
			var link = $('<a target="_blank" class="methodLink" href="'+object.chargeassayLink+'" id="chargeassay">'+object.chargeassay+'</a>');
			$("#chargeassayNm").append(link);
		} else {
			$("#chargeassayNm").text(object.chargeassay);
		}

		if( (object.sec != "") && (object.secLink != "") ){
			$("#secNm").text("");
			var link = $('<a target="_blank" class="methodLink" href="'+object.secLink+'" id="sec">'+object.sec+'</a>');
			$("#secNm").append(link);
		} else {
			$("#secNm").text(object.sec);
		}

		if( (object.rcesds != "") && (object.rcesdsLink != "") ){
			$("#rcesdsNm").text("");
			var link = $('<a target="_blank" class="methodLink" href="'+object.rcesdsLink+'" id="rcesds">'+object.rcesds+'</a>');
			$("#rcesdsNm").append(link);
		} else {
			$("#rcesdsNm").text(object.rcesds);
		}

		if( (object.titer != "") && (object.titerLink != "") ){
			$("#titerNm").text("");
			var link = $('<a target="_blank" class="methodLink" href="'+object.titerLink+'" id="titer">'+object.titer+'</a>');
			$("#titerNm").append(link);
		} else {
			$("#titerNm").text(object.titer);
		}

		if( (object.chopelisa != "") && (object.chopelisaLink != "") ){
			$("#chopelisaNm").text("");
			var link = $('<a target="_blank" class="methodLink" href="'+object.chopelisaLink+'" id="chopelisa">'+object.chopelisa+'</a>');
			$("#chopelisaNm").append(link);
		} else {
			$("#chopelisaNm").text(object.chopelisa);
		}


		if( (object.proaelisa != "") && (object.proaelisaLink != "") ){
			$("#proaelisaNm").text("");
			var link = $('<a target="_blank" class="methodLink" href="'+object.proaelisaLink+'" id="proaelisa">'+object.proaelisa+'</a>');
			$("#proaelisaNm").append(link);
		} else {
			$("#proaelisaNm").text(object.proaelisa);
		}

		// populate expanded table
		if (object.expanded != null) {
			$("#dp").show();
			$("#expanded").show();
			$("#expanded-table").show();

			$("#expanded-row1").text(object.expanded[0].row);
			$("#expanded-row1-col1").text(object.expanded[0].formulation);
			$("#expanded-row1-col2").text(object.expanded[0].rheology);
			$("#expanded-row1-col3").text(object.expanded[0].container);
			$("#expanded-row1-col4").text(object.expanded[0].presentation);

			$("#expanded-row2").text(object.expanded[1].row);
			$("#expanded-row2-col1").text(object.expanded[1].formulation);
			$("#expanded-row2-col2").text(object.expanded[1].rheology);
			$("#expanded-row2-col3").text(object.expanded[1].container);
			$("#expanded-row2-col4").text(object.expanded[1].presentation);		
		} else {
			$("#dp").hide();
			$("#expanded").hide();
			$("#expanded-table").hide();
		}


		// populate team table
		$("#process-lead").text(object.process_lead);
		$("#analytical-lead").text(object.analytical_lead);
		$("#formulation-lead").text(object.formulation_lead);
		$("#upstream-lead").text(object.upstream_lead);
		$("#downstream-lead").text(object.downstream_lead);
		$("#linkFile").attr("href", object.linkFile);

		$("#detail-container").children().each(function() {
		    $(this).html($(this).html().replace(/NA at publication/g,'<div class="na">n/a at publication</div>'));
		});

		var colorString;
		if (object.class1 == ""){
			colorString = object.modality;
		} else {
			colorString = object.class1;
		}

		var color = classColors(colorString);
		$("#detail-class1, .detail-title").css("color", color)
		var color2 = classColors(object.class2);
		$("#detail-class2").css("color", color2);

		if(object.class3){
			$("#detail-class3").text(object.class3);
			var color3 = classColors(object.class3);
			$("#detail-class3").css("color", color3)
		} else {
			$("#detail-class3").text("");
		}
		if (gridView) {
			$( 'html, body' ).animate({
	            scrollTop: $(".detail-anchor").offset().top - 263 // 259 is the offset from top of screen to the tile
	      	}, 1000 );
		} 

	}

	function closeDetail() {
		$('.tile').removeClass('selected');
		$('.stamp').hide();
		$('.tile, #grid-header').css("opacity", "1");
		$('#hover-container').hide();
		$('#detailview_header').fadeOut();
		if (gridView) {
			container.isotope( 'unstamp', stampElem );
			updateIso();
		} else {
			$("#footer").hide();
		}

		isStamped = false;
		detailOpen = false;
	}
	// this positions the "notch" on the hover tile
	function positionNotch(tile, isJustOne) {
		var isJustOne = isJustOne || false;
		var tileX = $(tile).position().left;
		var tileW = 145;
		var padding = 35;
		var notchW = 15;
		$("#hover-notch").show(); // turned off for now
		if (isJustOne) {
			$('#hover-notch').css('margin-left', 42);
		} else {
			$('#hover-notch').css('margin-left', tileX + tileW - padding - notchW +  "px");
		}
	}

	function countTiles(){
		tileCount = 0;
		if (gridView) {
			var $filtered = container.data('isotope').filteredItems;
			var visibleCount = $filtered.length;
			tileCount = visibleCount;
		} else if (!gridView) {
			tileCount = $(".tile:visible").length;
		}

		if (tileCount == 1) {
			$("#tile-number").text(tileCount + " result");
			/*setTimeout(function(){
				ifOneResult();	 
				}, 500); */
		} else {
			$("#tile-number").text(tileCount + " results");
		} 
		//var header = $("#tile-number").text(tileCount);
	}

	function updateHover(object){
		replaceEmpties(object);

		$("#molecule-name").text(object.molecule_name);
		$("#alternate-names").text(object.alternate_names);
		$("#pstformed").text(object.pstformed);
		$("#class1").text(object.class1);
		$("#class2").text(object.class2);
		$("#modality").text(object.modality);
		$("#extinctioncoeff").text(object.extinctioncoeff);
		$("#peptidemw").text(object.peptidemw);
		$("#pi").text(object.pi);
		$("#molecule-illustration img").attr("src", "/static/img/" + object.molecule_illustration);

		$("#hover-container").children().each(function() {
		    $(this).html($(this).html().replace(/NA at publication/g,'<div class="na">N/A at publication</div>'));
		});

		var color = classColors(object.class1);
		$("#class1").css("color", color)
		var color2 = classColors(object.class2);
		$("#class2").css("color", color2)

		if(object.class3){
			$("#class3").text(object.class3);
			var color3 = classColors(object.class3);
			$("#class3").css("color", color3)
		} else {
			$("#class3").text("");
		}
	}

	/* opening and closing the filters menu, set timers for animation, to resize iso layout */
	function menuBehave () {
		if (!filterOpen) {
			$(".header").css("margin-left", "185px");
			$(".site-wrap").css("left", "185px");
			$("#tooltip").css("margin-left", "-185px");
			filterOpen = true;
			setTimeout(function() {
				updateGraph();
			}, 400);
		} else {
			$(".header").css("margin-left", "0px");
			$(".site-wrap").css("left", "0px");
			$("#tooltip").css("margin-left", "0");
			filterOpen = false;
			setTimeout(function() {
				updateGraph();
			}, 400);
		}
		setTimeout(function(){
			if(gridView){
				updateIso();
			}
		}, 400);
	}


	// link scrolling in detail view
	var scrollToAnchor = function( id ) {
	    var elem = $( "a[name='"+ id +"']" );
	    if ( typeof( elem.offset() ) === "undefined" ) {
	      elem = $( "#"+id );
	    }
	    if ( typeof( elem.offset() ) !== "undefined" ) {
	      $( 'html, body' ).animate({
	              scrollTop: elem.offset().top - 60
	      }, 1000 );
	    }
	};

	function classColors(string) {

 		if (string == "IgG1" ) {
 		//if ($( string = "IgG1" ) {
 			return "#af4799";
 		} 
 		if (string == "IgG2" ) {
 			return "#49c3d5";
 		}
 		if (string == "IgG4" ) {
 			return "#7ec142";
 		}
 		if (string == "Kappa LC" ) {
 			return "#744e9e";
 		}
 		if (string == "Lambda LC" ) {
 			return "#3894a2";
 		}
 		if (string == "CD3" ) {
 			return "#e24552";
 		}
 		if (string == "CD3-HSA" ) {
 			return "#ef6a3d";
 		}
 		if (string == "Fusion Protein" ) {
 			return "#334799";
 		}

 		if (string == "BiTe" ) {
 			return "#e24552";
 		} 
 		else if (string == "CD3-FC" ) {
 			return "#ddce12";
 		}
	}

	/*---------- MAKE GRAPH ----------*/


	var xAxis;
	var yAxis;
	var tooltip;

	// D3 Graph view initialize
	function initGraph() {

		$("#x-label").text(selectX);
		$("#y-label").text(selectY);

		// Chart creation code goes here
		vis = d3.select("#graph-container")
				.append("svg")
				.attr("id", "graph")
				.attr("height", height)
				.attr("width", width - margin);


		var xRange = d3.scale.linear().range([margin, width - margin])
					.domain([d3.min(sampleData, function (d) {
						return d.x;
					}),
					d3.max(sampleData, function (d) {
						return d.x;
					})
				]);

		var yRange = d3.scale.linear().range([height - margin, margin])
					.domain([d3.min(sampleData, function(d) {
						return d.y;
					}),
					d3.max(sampleData, function (d) {
						return d.y;
					})
				]);

		xAxis = d3.svg.axis()
				.scale(xRange)
				.tickSize(5)
				.tickSubdivide(true);

		yAxis = d3.svg.axis()
				.scale(yRange)
				.tickSize(5)
				.orient("left")
				.tickSubdivide(true);


		var tooltip = d3.select(".grid")
			.append("div")
			.attr("id", "tooltip")
			.style("position", "absolute")
			.style("z-index", "10")
			.html("<span class='tooltipXY'></span>" + "<br>" + "<span class='tooltipName'></span>")
			.style("visibility", "hidden");

		vis.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + (height - margin) + ")")
			.call(xAxis);

		vis.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(" + (margin) + ",0)")
			.call(yAxis);

		var circles = vis.selectAll("circle").data(sampleData);
	 
		circles
		    .enter()
		    .insert("circle")
		    .attr("cx", function(d) { return xRange (d.x); })
		    .attr("cy", function(d) { return yRange (d.y); })
		    .attr("r", 7)
		    .style("opacity", 0)
	}

	// Update data when search is initiated or filter is selected
	function updateGraph() {

		stopTransition();

		var extraMargin;
		if (filterOpen) {
			extraMargin = 150;
		} else if (!filterOpen) {
			extraMargin = 0;
		}


		var xUpdate = []; 
		var yUpdate = [];

		// find X Axis selection
		if (selectX == "PI") {
			xUpdate = piData;
		} else if (selectX == "Extinct Coeff")  {
			xUpdate = extData;
		} else if (selectX == "Peptide Mw") {
			xUpdate = mwData;
		} else if (selectX == "pH") {
			xUpdate = phData;
		}

		// find Y Axis selection
		if (selectY == "PI") {
			yUpdate = piData;
		} else if (selectY == "Extinct Coeff")  {
			yUpdate = extData;
		} else if (selectY == "Peptide Mw") {
			yUpdate = mwData;
		} else if (selectY == "pH") {
			yUpdate = phData;
		}


		var updateData = [];
		var visibleTiles = [];
		var visibleMinMax = [];

		$(".tile:visible").each(function() {
				visibleTiles.push($(this).attr("id"));
			}); 

		for (var i = 0; i < amgNumbers.length; i++) {
			for (var q = 0; q < visibleTiles.length; q++) {
				if (visibleTiles[q] == mIndex[i]) {
					visibleMinMax.push({ "x": xUpdate[i], "y": yUpdate[i], "amg": amgNumbers[i], "mID": mIndex[i]});
				}
			}
			updateData.push({ "x": xUpdate[i], "y": yUpdate[i], "amg": amgNumbers[i], "mID": mIndex[i]});
		};

		var xRange = d3.scale.linear().range([margin, width - margin - extraMargin])
					.domain([d3.min(visibleMinMax, function(d) {
						return d.x;
					}),
					d3.max(visibleMinMax, function(d) {
						return d.x;
					})
				]);

		var yRange = d3.scale.linear().range([height - margin, margin])
					.domain([d3.min(visibleMinMax, function(d) {
						return d.y;
					}),
					d3.max(visibleMinMax, function(d) {
						return d.y;
					})
				]);

		d3.selectAll("circle")
			.data(updateData)
			.transition()
			.attr("cx", function(d) { return xRange(d.x); })
		    .attr("cy", function(d) { return yRange(d.y); })
		    .attr("id", function(d) { return d.mID; })
		    .attr("dy", function(d) { return d.y; })
		    .attr("dx", function(d) { return d.x; })
		    .duration(400);

		xAxis = d3.svg.axis()
			.scale(xRange);

		yAxis = d3.svg.axis()
			.scale(yRange)
			.orient("left");

		vis.selectAll("g.x.axis")
			.transition()
			.attr("transform", "translate(0," + (height - margin) + ")")
			.duration(400)
       		.call(xAxis);

		vis.selectAll("g.y.axis")
			.transition()
			.duration(400)
       		.call(yAxis);

	}
	
	// When window is resized, update window
	function updateWindow() {
		startTransition();

		x = w.innerWidth || e.clientWidth || g.clientWidth;
		y = w.innerHeight || e.clientHeight || g.clientHeight;

		width = x - margin - 350;

		if(width < 850){
			width = 850;
		}
		height = y - 50 - margin;
		vis.attr("width", width).attr("height", height);
		if(!gridView && tileCount > 1){
			updateGraph();
		}
	}


	function startTransition() {
		isTransitioning = true;
	}

	function stopTransition() {
		isTransitioning = false;
	}


	/* ======================= */
	/* Load Data and Init View */
	/* ======================= */

	initView(data);
	initGraph();
	updateGraph();
	menuBehave(); // open menu by default

	$(window).onresize = updateWindow;

}); // end

$(document).ready(function() {    
	$('.detail-tabs-menu li a:not(:first)').addClass('inactive');
	$('.tab-content').hide();
	$('.tab-content:first').show();
    
	$('.detail-tabs-menu li a').click(function(){
    	var t = $(this).attr('id');
  		if($(this).hasClass('inactive')) { 
    		$('.detail-tabs-menu li a').addClass('inactive');           
    		$(this).removeClass('inactive');
    
    		$('.tab-content').hide();
    		$('#'+ t + 'c').fadeIn('slow');
 		}
	});
});