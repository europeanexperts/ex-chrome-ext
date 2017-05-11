(function ($) {
  'use strict';

  var $popup         = $('.popup');
  var $popupBackdrop = $('.popup-backdrop');

  $(document).ready(function () {
    $popupBackdrop.on('click', function () {
      $popup.toggleClass('hide');
      $popupBackdrop.toggleClass('hide');
    });
  });

  $(document).on('click', '[data-popup-id]', function () {
    var $popupId = $(this).attr('data-popup-id');

    $('#' + $popupId).toggleClass('hide');
    $popupBackdrop.toggleClass('hide');
  });

})(jQuery);
