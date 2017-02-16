$(function () {
   // mobile conversion nav menu
	var burger = document.querySelector('.w-burger-menu');
	var overlay = document.querySelector('.w-nav-overlay');

	if (burger != null) {
		burger.addEventListener('click', function(e) {
			e.preventDefault();
			if (burger.className == 'w-burger-menu') {
				burger.classList.add('open');
				overlay.classList.add('open');
			} else {
				burger.classList.remove('open');
				overlay.classList.remove('open');
			}
		});
	}

	/****
	Signup Footer
	****/
	function getCookieValue(name) {
		var value = '; ' + document.cookie;
		var parts = value.split('; ' + name + '=');
		if (parts.length == 2) {
			return parts.pop().split(';').shift();
		} else {
			return false;
		}
	}

	function getCookieExpire(days) {
		var d;

		if (days && typeof days == 'number') {
			d = new Date(Date.now() + (days * 86400000));
		} else {
			d = new Date(Date.now() + (14 * 86400000));
		}

		return d.toUTCString();
	}

	var signupFooter = document.querySelector('.signup-footer');

	if (signupFooter != null && !getCookieValue('_userDeclinedFooterSignup')) {
		var declineSignup = document.querySelector('#close-signup-footer');
		var mainFooter = document.querySelector('#colophon');

		if (mainFooter != null) {
			mainFooter.style.paddingBottom = '90px';
		}

		signupFooter.classList.add('show-signup-footer');


		declineSignup.addEventListener('click', function(e) {
			e.preventDefault();

			if (mainFooter != null) {
				mainFooter.style.paddingBottom = '25px';
			}

			signupFooter.classList.remove('show-signup-footer');
			signupFooter.classList.add('close-signup-footer');

			document.cookie = '_userDeclinedFooterSignup=true; expires=' + getCookieExpire(14) + ';';
		})
	}
	/****
	!Signup Footer
	****/
});