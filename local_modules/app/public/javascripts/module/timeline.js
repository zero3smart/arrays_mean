/**
 * Tooltip behavior on mouse hover
 */
var $timelineGroupItem = $('.timeline-group-item');

$timelineGroupItem.each(function(i) {
	var $this = $(this);

	var $tooltip = $this.find('.global-tooltip');

	$this.on('mouseover', function(d) {
		$tooltip.css('display', 'block');
	});

	$this.on('mousemove', function() {
		$tooltip.css('top', (event.pageY - 15 - $this.offset().top)+'px').css('left', (event.pageX - $this.offset().left)+'px');
	});

	$this.on('mouseout', function() {
		$tooltip.css('display', 'none');
	});
});