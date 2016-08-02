/**
 * Tooltip
 */
var $tooltip = $('<div class="global-tooltip"></div>').appendTo('body');

var $tooltipKey = $('<span class="tooltip-key"></span>').appendTo($tooltip);

var $tooltipValue = $('<span class="tooltip-value"></span>').appendTo($tooltip);

/**
 * Tooltip behavior on mouse hover
 */
var $keywordFrequencyLink = $('.keyword-frequency-link.has-tooltip');

$keywordFrequencyLink.each(function(i) {
	var $this = $(this);

	$this.on('mouseover', function() {
		$tooltipKey.html($this.data('tooltip-key'));
		$tooltipValue.html($this.data('tooltip-value'));
		$tooltip.css('display', 'block');
	});

	$this.on('mousemove', function() {
		$tooltip.css('top', (event.pageY - 15)+'px').css('left', (event.pageX)+'px');
	});

	$this.on('mouseout', function() {
		$tooltip.css('display', 'none');
	});
});