jQuery(document).ready(function () {
    'use strict';
    // When the user clicks on start
    jQuery('#start').click(function () {
        // We create a new Game
        game = new Quoridor();
        // We set its size
        game.setSize();
        // We hide the start button
        jQuery('#start').fadeOut('fast');
        // We show the canvas
        jQuery('figure').slideDown('slow');
        // Start the game !
        game.turn();
        // On resize, we reset the size
        jQuery(window).resize(function () {
            game.setSize();
        });
        // We catch any username change
        jQuery('#name').change(function () {
            game.user.setName();
            game.user.displayName();
        });
    });
    // Hide the loader, show the start button
    jQuery('#loader').hide();
    jQuery('#start').fadeIn('slow');
});