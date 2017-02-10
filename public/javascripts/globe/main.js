// ----------
var GlobeMain = {
    // ----------
    init: function() {
      var self = this;

      var offsetY = document.getElementsByClassName("map-container")[0].offsetTop + document.getElementsByClassName("navbar-brand-container")[0].clientHeight;
      document.getElementsByClassName('map-container')[0].style.height = window.innerHeight - offsetY + "px";

      var points = [];
      _.each(flightPaths, function(v, i) {
        points.push({
          lat: v.origin.lat,
          lng: v.origin.lon
        });
        
        points.push({
          lat: v.destination.lat,
          lng: v.destination.lon
        });
      });
      
        points = _.uniqBy(points, function(v, i) {
            return '' + v.lat + 'x' + v.lng;
        });

      this.globeView = new GlobeMain.GlobeView({
        $el: $('#globe'),
        points: points
        // onCityClick: function(cityNode) {
        //   self.openStory(cityNode.story.key, cityNode.city);
        // },
        // onDeselectCity: function() {
        //   self.closeStory();
        // },
      });

      this.globeView.start();
    },
    
    // ----------
    coordToVector: function(lat, lng, radius) {
      var phi = (90 - lat) * Math.PI / 180;
      var theta = (180 - lng) * Math.PI / 180;

      return new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta));
    },

    // ----------
    // TODO: Support touch
    on: function(eventName, $el, handler, name) {
      $el.on(eventName, handler);
    },

    // ----------
    // TODO: Support touch
    off: function(eventName, $el, handler, name) {
      $el.off(eventName, handler);
    }
};

// ----------
$(document).ready(function() {
  GlobeMain.init();
});
