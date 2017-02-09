// ----------
var GlobeMain = {
    // ----------
    init: function() {
      var self = this;

      var offsetY = document.getElementsByClassName("map-container")[0].offsetTop + document.getElementsByClassName("navbar-brand-container")[0].clientHeight;
      document.getElementsByClassName('map-container')[0].style.height = window.innerHeight - offsetY + "px";

      this.scale = 1; // TODO
      this.time = 0; //TODO

      this.globeView = new GlobeMain.GlobeView({
        $el: $('#globe'),
        // onCityClick: function(cityNode) {
        //   self.openStory(cityNode.story.key, cityNode.city);
        // },
        // onDeselectCity: function() {
        //   self.closeStory();
        // },
        onMouseDown: function(event) {
          // if (event.which !== 1) {
          //   return;
          // }
          //
          // self._hideExitControl();
          //
          // self._drag = {
          //   startX: event.clientX / self.scale,
          //   startY: event.clientY / self.scale,
          //   diff: new zot.point(0, 0),
          //   startTime: GlobeMain.time,
          //   isDrag: false
          // };
          //
          // if (self._drag.startY >= self.world.height() - 100) {
          //   self._drag.filters = true;
          //   return true;
          // }
        },
        onDrag: function(event) {
          // if (!self._drag) {
          //   return;
          // }
          //
          // var x = event.clientX / self.scale;
          // var y = event.clientY / self.scale;
          // self._drag.diff = new zot.point(x - self._drag.startX, y - self._drag.startY);
          // var distance = self._drag.diff.polar().distance;
          //
          // if (self._drag.filters) {
          //   self.filters.drag(self._drag.diff.y);
          // } else {
          //   if (distance > 10) {
          //     self._drag.isDrag = true;
          //     self.rotationView.show();
          //     self.filters.hide();
          //
          //     if (self.holdCircle) {
          //       self.holdCircle.destroy();
          //       self.holdCircle = null;
          //     }
          //   }
          // }
          //
          // self.rotationView.update();
        },
        onMouseUp: function() {
          // if (!self._drag) {
          //   return;
          // }
          //
          // if (self._drag.filters) {
          //   if (self._drag.diff.y < -35) {
          //     self.filters.show();
          //   } else {
          //     self.filters.hide();
          //   }
          // }
          //
          // if (self.holdCircle) {
          //   self.holdCircle.destroy();
          //   self.holdCircle = null;
          // }
          //
          // self._drag = null;
          // self.rotationView.hide();
        }
      });

      this.globeView.start();
    },

    // ----------
    on: function(eventName, $el, handler, name) {
      $el.on(eventName, handler);
    },

    // ----------
    off: function(eventName, $el, handler, name) {
      $el.off(eventName, handler);
    }
};

// ----------
$(document).ready(function() {
  GlobeMain.init();
});
