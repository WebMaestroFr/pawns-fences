var game, anim, startAnim, pawnAnim, fenceAnim;

function Square(a, b) {
    'use strict';
    // The coordinates
    this.a = a;
    this.b = b;
    // Lengths of the shortest paths from this square to the closest winning position, for every players goals.
    this.paths = {
        up: b,
        right: game.size - a,
        down: game.size - b,
        left: a
    };
    // We'll need this property to make sure that we're not overriding any calculation currently made on this object
    this.token = false;
}

function Player(i, base, limit) {
    'use strict';
    // Index of this player in the game.players array
    this.i = i;
    // Call the parent Square constructor
    Square.call(this, base.a, base.b);
    this.setAccess();
    // How many fences this player got left
    this.limit = limit;
    // Which line is this player's goal
    this.goal = (base.a === 0) ? 'right' : (base.a === game.size) ? 'left' : (base.b === 0) ? 'down' : 'up';
    // Add the player's div to the interface
    this.caption = jQuery('<div id="player-' + i + '" class="player goal-' + this.goal + '" style="border-color:' + game.colors.pawns[i] + '"><span class="name">' + this.name + '</span><span style="color:' + game.colors.pawns[i] + '" class="fences pull-right"></span></div>');
    jQuery('#players').append(this.caption);
    this.displayFences();
}
// Inherit Square
Player.prototype = Object.create(Square.prototype);

function User(i, base, limit) {
    'use strict';
    this.setName();
    // Call the parent constructor
    Player.call(this, i, base, limit);
}
// Inherit Player
User.prototype = Object.create(Player.prototype);

function Computer(i, base, limit) {
    'use strict';
    this.name = 'Computer';
    // Call the parent constructor
    Player.call(this, i, base, limit);
}
// Inherit Player
Computer.prototype = Object.create(Player.prototype);

function Quoridor(options) {
    'use strict';
    // The settings and their default values
    var settings = jQuery.extend(true, {
            // User ID (false stands for an unlogged user)
            user: false,
            // Players IDs (false stands for an unlogged user, null stands for an AI)
            players: [false, null],
            // Number of rows and columns (have to be an even number)
            size: 8,
            units: {
                // Span size compared to a pattern unit
                span: 1 / 4,
                // Pawn diameter compared to a pattern unit
                pawn: 1 / 2
            },
            colors: { stroke: 'rgba(0,0,0,0.15)', square: '#eee', fence: '#999', pawns: ['#7a43b6', '#f89406', '#9d261d', '#049cdb'] }
        }, options),
        // The pawn's original positions (depending on the number of players)
        bases = (settings.players.length === 2) ? [
            {a: settings.size / 2, b: settings.size},
            {a: settings.size / 2, b: 0}
        ] : [
            {a: settings.size / 2, b: settings.size},
            {a: 0, b: settings.size / 2},
            {a: settings.size / 2, b: 0},
            {a: settings.size, b: settings.size / 2}
        ],
        i,
        a,
        b,
        // How many fences per player, in ratio of the board size
        limit = Math.floor(((Math.pow(settings.size, 2) * 5 / 16) + settings.players.length / 2) / settings.players.length);
    // The game global. By doing this here, we can already access this current game object within the different classes we're about to construct
    game = this;
    this.size = Math.ceil(settings.size / 2.0) * 2;
    // Graphical sizes based on a pattern unit (square + span = 1)
    this.units = settings.units;
    this.units.square = 1 - this.units.span;
    // One fence is blocking two squares
    this.units.fence = 2 - this.units.span;
    // And let's record this "pawn" unit as a radius already
    this.units.pawn = this.units.pawn / 2;
    this.colors = settings.colors;
    // Set the board
    this.board = [];
    // For all coordinates
    for (a = 0; a <= this.size; a += 1) {
        this.board.push([]);
        for (b = 0; b <= this.size; b += 1) {
            // We record a square in our "board" array
            this.board[a].push(new Square(a, b));
            // So for example, our square with the coordinates {a: 3, b: 7} will be game.board[3][7].
        }
    }
    // And now that they are all constructed, we create relations between those squares : the "accesses"
    for (a = 0; a <= this.size; a += 1) {
        for (b = 0; b <= this.size; b += 1) {
            this.board[a][b].initAccess();
        }
    }
    // Set the players
    this.players = [];
    for (i = 0; i < settings.players.length; i += 1) {
        switch (settings.players[i]) {
        case settings.user:
            // The user, "you"
            this.user = new User(i, bases[i], limit);
            this.players.push(this.user);
            break;
        case null:
            // Plays against the machine
            this.players.push(new Computer(i, bases[i], limit));
            break;
        }
    }
    // Set the fences
    this.fences = [];
    // Set the interface
    this.canvas = document.getElementById('interface');
    this.ctx = this.canvas.getContext('2d');
    // A cheap way to set the first player in turn (could be random)
    this.current = this.players.length - 1;
}

Quoridor.prototype.turn = function () {
    'use strict';
    // Set paths and accesses to make sure all data is up to date
    this.validPawns();
    if (this.players[this.current].win()) {
        // We got a winner ! We got a winner ! We got a winner !
        alert(this.players[this.current].name + ' win.');
    } else {
        // Next player
        this.current = ((this.current + 1) < this.players.length) ? (this.current + 1) : 0;
        // We render the game, and then start the new player's turn
        if (this.render()) { this.players[this.current].play(); }
    }
};

Quoridor.prototype.validPawns = function () {
    'use strict';
    var i;
    for (i = 0; i < this.players.length; i += 1) {
        // First we set the accesses
        this.players[i].setAccess();
        // Then the paths
        if (!this.players[i].setPath()) {
            // And we return false in case of a problem (isolated pawn) : we answer the test
            return false;
        }
    }
    // This is a valid move indeed
    return true;
};

Quoridor.prototype.getPosition = function (a, b) {
    'use strict';
    var i;
    for (i = 0; i < game.players.length; i += 1) {
        if ((game.players[i].a === a) && (game.players[i].b === b)) {
            // If this position is occupied by a pawn, we return the player
            return game.players[i];
        }
    }
    // Otherwise, we return the square
    return this.board[a][b];
};

Quoridor.prototype.setSize = function () {
    'use strict';
    // Set the extremes, and calculate the size.
    var min = 200,
        max = jQuery(window).width() - 100,
        size = jQuery(window).height() - 225;
    // Responsive details
    if (jQuery(window).width() < 980) { size -= 10; }
    // Restrict sizes to the extremes
    if (size < min) { size = min; } else if (size > max) { size = max; }
    // Resize the canvas
    jQuery('figure').width(size + 60);
    this.canvas.width = size;
    this.canvas.height = size;
    // Resize the player's captions
    jQuery('#players').css({'width': size, 'height': size});
    // For calculations sake, all sizes are defined in ratio of a pattern unit
    this.pattern = size / (this.board.length - this.units.span);
    // Render the interface with the new ratio
    this.render();
};

Quoridor.prototype.render = function (preview, progress) {
    'use strict';
    // For animations, the "preview"'s opacity will equal the progress
    if (progress === undefined) { progress = 0.5; }
    var i, j, x, y,
        square = this.units.square * this.pattern,
        pawn = this.units.pawn * this.pattern, // This is a radius...
        fence = this.units.fence * this.pattern,
        span = this.units.span * this.pattern;
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = this.colors.stroke;
    this.ctx.lineWidth = 1;
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw the squares
    this.ctx.fillStyle = this.colors.square;
    for (i = 0; i <= this.size; i += 1) {
        for (j = 0; j <= this.size; j += 1) {
            x = i * this.pattern;
            y = j * this.pattern;
            this.ctx.fillRect(x, y, square, square);
            this.ctx.strokeRect(x, y, square, square);
        }
    }
    this.ctx.lineWidth = 2;
    // Draw the fences
    this.ctx.fillStyle = this.colors.fence;
    for (i = 0; i < this.fences.length; i += 1) {
        x = this.fences[i].a * this.pattern;
        y = this.fences[i].b * this.pattern;
        if (this.fences[i].horizontal) {
            y += square;
            this.ctx.fillRect(x, y, fence, span);
            this.ctx.strokeRect(x, y, fence, span);
        } else {
            x += square;
            this.ctx.fillRect(x, y, span, fence);
            this.ctx.strokeRect(x, y, span, fence);
        }
    }
    this.ctx.lineWidth = 4;
    // Draw the pawns
    for (i = 0; i < this.players.length; i += 1) {
        x = (this.players[i].a * this.pattern) + (square / 2);
        y = (this.players[i].b * this.pattern) + (square / 2);
        this.ctx.fillStyle = this.colors.pawns[i];
        this.ctx.beginPath();
        this.ctx.arc(x, y, pawn, 0, (Math.PI * 2), true);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }
    this.ctx.globalAlpha = 0.4;
    // Highlight the current player
    x = (this.players[this.current].a * this.pattern) + (square / 2);
    y = (this.players[this.current].b * this.pattern) + (square / 2);
    this.ctx.fillStyle = this.colors.pawns[this.current];
    this.ctx.beginPath();
    this.ctx.arc(x, y, (pawn + 4), 0, (Math.PI * 2), true);
    this.ctx.closePath();
    this.ctx.fill();
    // Draw the preview (if sent in parameter)
    if (preview) {
        // Opacity eventually depends on the progress
        this.ctx.globalAlpha = progress;
        x = preview.a * this.pattern;
        y = preview.b * this.pattern;
        if (preview instanceof Square) {
            // Draw a pawn
            x = (preview.a * this.pattern) + (square / 2);
            y = (preview.b * this.pattern) + (square / 2);
            this.ctx.beginPath();
            this.ctx.arc(x, y, pawn, 0, (Math.PI * 2), true);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        } else {
            // Draw a fence
            if (preview.horizontal) {
                y += square;
                this.ctx.fillRect(x, y, fence, span);
                this.ctx.strokeRect(x, y, fence, span);
            } else {
                x += square;
                this.ctx.fillRect(x, y, span, fence);
                this.ctx.strokeRect(x, y, span, fence);
            }
        }
    }
    //  This line is good for tests :
    /* for (i = 0; i < this.board.length; i += 1) { for (j = 0; j < this.board[i].length; j += 1) { if (this.board[i][j].paths) { x = i * this.pattern; y = j * this.pattern; this.ctx.fillStyle = this.board[i][j].open ? 'red' : 'black'; this.ctx.fillText(this.board[i][j].paths.up, x + 8, y + 8); this.ctx.fillText(this.board[i][j].paths.right, x + 16, y + 16); this.ctx.fillText(this.board[i][j].paths.down, x + 8, y + 24); this.ctx.fillText(this.board[i][j].paths.left, x, y + 16); } } } */
    return true;
};

// This is still part of the construction process, but it can only be run once every square on the board exists.
Square.prototype.initAccess = function () {
    'use strict';
    // What do we access for every directions from this square
    this.access = {
        up: (this.b !== 0) ? game.board[this.a][this.b - 1] : false,
        right: (this.a !== game.size) ? game.board[this.a + 1][this.b] : false,
        down: (this.b !== game.size) ? game.board[this.a][this.b + 1] : false,
        left: (this.a !== 0) ? game.board[this.a - 1][this.b] : false
    };
};

Square.prototype.pathFinder = function (goal, value) {
    'use strict';
    var move;
    if (!value) {
        // No value to set : we haven't found a way yet. So let's take that token and find it !
        this.token = true;
        // Is this a winning position ?
        if (this.paths[goal] === 0) {
            // Yep ! So the longest possible path length is "one" from the neighbouring positions.
            value = 1;
        } else {
            // Nope. Let's set the path to false, we need to reset it.
            this.paths[goal] = false;
        }
    } else {
        // We got a value here, let's set it.
        this.paths[goal] = value;
        // And logically, we add one to the neighbouring positions paths.
        value += 1;
    }
    // Then for every valid access (!== false)
    for (move in this.access) {
        if (this.access.hasOwnProperty(move) && this.access[move]) {
            // If the position is not already busy finding its way (token === false)
            if (!this.access[move].token) {
                // Get to work !
                this.access[move].pathFinder(goal, false);
            }
            // Ok now, if the longest possible path we found is either shorter or the only one we found so far for the position
            if (value && ((this.access[move].paths[goal] === false) || (this.access[move].paths[goal] > value))) {
                // Let's set it up !
                this.access[move].pathFinder(goal, value);
            }
        }
    }
};

// We set the requestAnimationFrame as Paul Irish told us to.
(function(){for(var d=0,a=["ms","moz","webkit","o"],b=0;b<a.length&&!window.requestAnimationFrame;++b)window.requestAnimationFrame=window[a[b]+"RequestAnimationFrame"],window.cancelAnimationFrame=window[a[b]+"CancelAnimationFrame"]||window[a[b]+"CancelRequestAnimationFrame"];window.requestAnimationFrame||(window.requestAnimationFrame=function(b){var a=(new Date).getTime(),c=Math.max(0,16-(a-d)),e=window.setTimeout(function(){b(a+c)},c);d=a+c;return e});window.cancelAnimationFrame||(window.cancelAnimationFrame=function(a){clearTimeout(a)})})();

Player.prototype.setAccess = function () {
    'use strict';
    // We get the accesses from the Square this Player is on
    this.access = game.board[this.a][this.b].access;
    // And we set this Player as the access of the neighbouring positions (if they're valid, !== false)
    if (this.access.up) { this.access.up.access.down = this; }
    if (this.access.right) { this.access.right.access.left = this; }
    if (this.access.down) { this.access.down.access.up = this; }
    if (this.access.left) { this.access.left.access.right = this; }
    // Make the callbacks easy
    return true;
};

Player.prototype.setPath = function () {
    'use strict';
    var i, j;
    // We run the pathFinder for this player's goal and from its current position
    this.pathFinder(this.goal, false);
    // We reset every Square's and Player's tokens to false (before any new pathFinder() call)
    for (i = 0; i <= game.size; i += 1) { for (j = 0; j <= game.size; j += 1) { game.board[i][j].token = false; } }
    for (i = 0; i < game.players.length; i += 1) { game.players[i].token = false; }
    // We apply this player's paths to its position
    game.board[this.a][this.b].paths = this.paths;
    // And we return what we set
    return this.paths[this.goal];
};

Player.prototype.getAccess = function (jump, goal) {
    'use strict';
    var direction, square, move = false;
    // Do we get the access as a neighbouring pawn ? Is the jumping allowed ?
    if (jump === undefined) { jump = true; goal = this.goal; }
    for (direction in this.access) {
        // For each valid access
        if (this.access.hasOwnProperty(direction) && this.access[direction]) {
            // Get either that Square object, either a one from that Player object
            if (!(this.access[direction] instanceof Player)) {
                square = this.access[direction];
            } else if (jump) {
                // If this access is a neighbouring pawn and we can jump it : we call the access from it (disabling jump).
                square = this.access[direction].getAccess(false, goal);
            } else {
                // You can't jump more than one pawn
                square = false;
            }
            // Is that square our smartest move so far ? Oh, and if a jump, is it a valid one ?
            if (square && (!move || (square.paths[goal] < move.paths[goal]) || ((square.paths[goal] === move.paths[goal]) && (Math.random() < 0.5))) && (!jump || !this.access[direction].access[direction] || (this.access[direction].access[direction] instanceof Player) || (this.a === square.a) || (this.b === square.b))) {
                // Yep, let's set it up.
                move = square;
            }
        }
    }
    // This now must be the smartest move.
    return move;
};

Player.prototype.getPath = function () {
    'use strict';
    // Basically return this player's path
    return this.paths[this.goal];
};

Player.prototype.validSquare = function (square) {
    'use strict';
    // "a" and "b" here are the difference between our pawn's coordinates and our destination's ones
    var a = Math.abs(square.a - this.a),
        b = Math.abs(square.b - this.b),
        move,
        opp;
    for (move in this.access) {
        if (this.access.hasOwnProperty(move) && this.access[move]) {
            if ((this.access[move].a === square.a) && (this.access[move].b === square.b)) {
                // Our destination is recorded in this player's valid accesses !
                if (this.access[move] instanceof Player) {
                    // #rule-6 : When two pawns face each other on neighbouring squares which are not separated by a fence, the player whose turn it is can jump the opponent's pawn (and place himself behind him), thus advancing an extra square.
                    game.rule = 6;
                    return false;
                }
                // Our destination is a valid Square object...
                return true;
            }
            if (this.access[move] instanceof Player) {
                // This player has access to another Pawn : he has a neighbour.
                for (opp in this.access[move].access) {
                    // And if this neighbour has access to our destination, is it a valid one ?
                    if (this.access[move].access.hasOwnProperty(opp) && this.access[move].access[opp] && (this.access[move].access[opp].a === square.a) && (this.access[move].access[opp].b === square.b)) {
                        // rule-8 : It is forbidden to jump more than one pawn.
                        if (this.access[move].access[opp] instanceof Player) { game.rule = 8; return false; }
                        // #rule-7 : If there is a fence behind the said pawn, the player can place his pawn to the left or the right of the other pawn.
                        if (this.access[move].access[move] && !(this.access[move].access[move] instanceof Player) && (move !== opp)) { game.rule = 7; return false; }
                        return true;
                    }
                }
            }
        }
    }
    // #rule-2 : The pawns are moved one square at a time, horizontally or vertically, forwards or backwards.
    // #rule-3 : The pawns must get around the fences.
    game.rule = (((a === 0) && (b === 1)) || ((b === 0) && (a === 1))) ? 3 : 2;
    return false;
};

Player.prototype.move = function (square) {
    'use strict';
    // We reset the accesses for the Square we're leaving
    if (this.access.up) { this.access.up.access.down = game.board[this.a][this.b]; }
    if (this.access.right) { this.access.right.access.left = game.board[this.a][this.b]; }
    if (this.access.down) { this.access.down.access.up = game.board[this.a][this.b]; }
    if (this.access.left) { this.access.left.access.right = game.board[this.a][this.b]; }
    // We set this "pawnAnim" global to our destination position
    pawnAnim = square;
    // We reset the "startAnim" global
    startAnim = false;
    // And we call the requestAnimationFrame to proceed this move
    anim = requestAnimationFrame(this.animPawn);
};

Player.prototype.putUp = function (fence) {
    'use strict';
    // Set the "fenceAnim" global to the fence we want to put up.
    fenceAnim = fence;
    // Reset the "startAnim" global
    startAnim = false;
    // And we call the requestAnimationFrame to proceed this move
    anim = requestAnimationFrame(this.animFence);
};

Player.prototype.animPawn = function () {
    'use strict';
    // "this" is getting out of this method's context, so we need to redefine the current player here
    var progress, player = game.players[game.current];
    // If this is the first call, we set the starting time
    if (!startAnim) { startAnim = Date.now(); }
    // Calculating the progress (the animation duration is 400ms)
    progress = (Date.now() - startAnim) / 400;
    // Set the new coordinates of our pawn (depending on the progress)
    player.a = player.a + (pawnAnim.a - player.a) * progress;
    player.b = player.b + (pawnAnim.b - player.b) * progress;
    // Render the interface.
    game.render();
    if (progress < 1) {
        // If the animation is not completed, we request another Animation Frame
        requestAnimationFrame(player.animPawn);
    } else {
        // Otherwise, we cancel the animation
        cancelAnimationFrame(anim);
        // We make sure our pawn exactly arrived to its destination
        player.a = pawnAnim.a;
        player.b = pawnAnim.b;
        // Set the pawn's accesses for this position
        player.setAccess();
        // Get the new paths values (which are the same as our new position)
        player.paths = game.board[player.a][player.b].paths;
        // And it's now the next player's turn !
        game.turn();
    }
};

Player.prototype.animFence = function () {
    'use strict';
    // "this" is getting out of this method's context, so we need to redefine the current player here
    var progress, player = game.players[game.current];
    // If this is the first call, we set the starting time
    if (!startAnim) { startAnim = Date.now(); }
    // Calculating the progress (the animation duration is 400ms)
    progress = (Date.now() - startAnim) / 400;
    // Render the interface.
    game.render(fenceAnim, progress);
    if (progress < 1) {
        // If the animation is not completed, we request another Animation Frame
        requestAnimationFrame(player.animFence);
    } else {
        // Otherwise, we cancel the animation
        cancelAnimationFrame(anim);
        // The player loses one of his fences
        player.limit -= 1;
        // Add this fence to game.fences
        game.fences.push(fenceAnim);
        // Close the accesses of the concerned objects
        game.closeAccess(fenceAnim);
        // Update the fences counter
        player.displayFences();
        // And it's now the next player's turn !
        game.turn();
    }
};

Player.prototype.win = function () {
    'use strict';
    switch (this.goal) {
    // Is the player now on his goal line ?
    case 'up':
        return (this.b === 0);
    case 'right':
        return (this.a === game.size);
    case 'down':
        return (this.b === game.size);
    case 'left':
        return (this.a === 0);
    }
};

Player.prototype.displayFences = function () {
    'use strict';
    var display = '', i;
    for (i = 0; i < this.limit; i += 1) { display += '|'; }
    // Display the fences left in this player's caption
    jQuery('.fences', this.caption).text(display);
};

User.prototype.play = function () {
    'use strict';
    // We won't be able to access "this" in the coming event-handlers
    var user = this;
    // Reset the action
    user.action = false;
    jQuery(game.canvas).click(function (event) {
        // If the user clicked, we get the action corresponding to the current mouse position
        user.setAction(event);
        if (!user.action) {
            // Wrong action : let's display the concerned rule
            user.alert(game.rule);
        } else {
            // Good action : Let's unbind those handlers and execute it !
            jQuery(game.canvas).unbind();
            if (user.action instanceof Square) { user.move(user.action); } else { user.putUp(user.action); }
        }
    });
    jQuery(game.canvas).mousemove(function (event) {
        // Every time the mouse is moving over the canvas, we get the action that its position would trigger on a click
        if (user.setAction(event)) {
            // We render and preview that action
            game.render(user.action);
            // And we update the cursor
            jQuery(game.canvas).css('cursor', (user.action !== false) ? 'default' : 'not-allowed');
        }
    });
    // If the mouse is exiting the board, we reset and redraw
    jQuery(game.canvas).mouseout(function () {
        user.action = false;
        game.render();
    });
};

User.prototype.setAction = function (event) {
    'use strict';
    // Get the mouse position from the event object
    var offset = jQuery(game.canvas).offset(),
        pointer = {x: (event.pageX - offset.left) / game.pattern, y: (event.pageY - offset.top) / game.pattern},
        // From this position we deduce the action implied
        action = this.getSpan(pointer) || this.getSquare(pointer);
    // Was this action already requested ? Are we actually talking about an action currently showed as a preview ?
    if ((action.a === this.action.a) && (action.b === this.action.b) && ((action instanceof Square && this.action instanceof Square) || (action.horizontal === this.action.horizontal))) {
        // If yes, then our job here is done.
        return false;
    }
    // Is this a valid action ?
    if (((action instanceof Square) && this.validSquare(action)) || (!(action instanceof Square) && game.validFence(action, this.limit))) {
        // If yes, let's set it up and return true
        this.action = action;
        return true;
    }
    // Was the last action invalid as well ?
    action = !!this.action;
    this.action = false;
    // And we return the answer to the question : was a new action set ?
    return action;
};

User.prototype.getSpan = function (pointer) {
    'use strict';
    // "a" and "b" here are the pattern coordinates, and "x" and "y" the coordinates of the pointer within this pattern unit.
    var shift = game.units.square / 2,
        a = Math.floor(pointer.x),
        b = Math.floor(pointer.y),
        x = pointer.x - a,
        y = pointer.y - b,
        horizontal;
    // If we don't have any fences left, no need to continue
    if (this.left === 0) { return false; }
    // Is our pointer over a span (a gap between two squares) ?
    if ((x > game.units.square) || (y > game.units.square)) {
        horizontal = (x < y);
        a = (horizontal && (x < shift)) ? a - 1 : a;
        b = (!horizontal && (y < shift)) ? b - 1 : b;
        // Avoid the fence to be defined out of the board
        if (a < 0) { a = 0; } else if (a >= game.size) { a = game.size - 1; }
        if (b < 0) { b = 0; } else if (b >= game.size) { b = game.size - 1; }
        // Yep, let's return the corresponding fence
        return {a: a, b: b, horizontal: horizontal};
    }
    // Nope, no fence to return
    return false;
};

User.prototype.getSquare = function (pointer) {
    'use strict';
    // Returning the closest Square.
    return game.board[Math.floor(pointer.x)][Math.floor(pointer.y)];
};

User.prototype.alert = function (rule) {
    'use strict';
    // Remind the user of a rule
    jQuery('#caption').html(jQuery('#rule-' + rule).html());
};

Computer.prototype.getOpponent = function () {
    'use strict';
    var i, opponent = false, path, oppPath;
    for (i = 0; i < game.players.length; i += 1) {
        path = game.players[i].getPath();
        // Is the path of that player the shortest ? Or randomly if equal :
        if ((this.i !== i) && (!opponent || (path < oppPath) || ((path === oppPath) && (Math.random() > 0.5)))) {
            opponent = game.players[i];
            oppPath = path;
        }
    }
    // Return the opponent with the shortest way to his goal line
    return opponent;
};

Computer.prototype.getDifference = function (opponent) {
    'use strict';
    // Return the difference between this Player's path and the given opponent's path
    return (this.getPath() - opponent.getPath());
};

Computer.prototype.getFence = function () {
    'use strict';
    var a, b, opponent = this.getOpponent(), difference = this.getDifference(opponent), newDif, fence = false, span;
    // If we cannot put any other fence, no need to continue
    if ((this.limit === 0) || (difference < 0)) { return false; }
    // For each position on board
    for (a = 0; a < game.size; a += 1) {
        for (b = 0; b < game.size; b += 1) {
            // We set a fence object.
            span = {a: a, b: b, horizontal: true};
            // Get the difference of path length for a valid potential object
            newDif = game.validFence(span, 1, opponent);
            if ((newDif !== false) && (newDif < difference)) {
                // That fence is valid and giving us the advantage
                difference = newDif;
                fence = jQuery.extend({}, span);
            }
            // Let's rotate and try again on the vertical axis.
            span.horizontal = false;
            newDif = game.validFence(span, 1, opponent);
            if ((newDif !== false) && (newDif < difference)) {
                difference = newDif;
                fence = jQuery.extend({}, span);
            }
        }
    }
    // Return the more advantageous fence, or false if we didn't set any
    return fence;
};

Computer.prototype.play = function () {
    'use strict';
    var action = this.getFence();
    if (action) {
        // We found a fence to put.
        this.putUp(action);
    } else {
        action = this.getAccess();
        // Let's move to the next position
        this.move(action);
    }
};

Quoridor.prototype.validFence = function (fence, limit, opponent) {
    'use strict';
    var i, a, b, h, player = this.players[this.current];
    // #rule-1 : When he has run out of fences, the player must move his pawn.
    if (limit === 0) { this.rule = 1; return false; }
    if (opponent === undefined) { opponent = false; }
    // #rule-4 : The fences must be placed between two sets of two squares.
    for (i = 0; i < this.fences.length; i += 1) {
        a = Math.abs(fence.a - this.fences[i].a);
        b = Math.abs(fence.b - this.fences[i].b);
        h = (fence.horizontal === this.fences[i].horizontal);
        if ((h && ((!fence.horizontal && (a === 0) && (b < 2)) || (fence.horizontal && (b === 0) && (a < 2)))) || ((a === 0) && (b === 0))) {
            // The fence we're trying to put up is overlapping an active one.
            this.rule = 4;
            return false;
        }
    }
    // #rule-5 : The fences can be used to facilitate the player's progress or to impede that of the opponent, however, an access to the goal line must always be left open.
    if (this.closeAccess(fence) && this.openAccess(fence)) {
        if (opponent) { return player.getDifference(opponent); }
        return true;
    }
    // It wasn't valid to close the accesses, we must have isolated a pawn.
    if (this.openAccess(fence)) {
        // This "if" ensures us that the accesses will be reseted in time before the end of the current execution
        this.rule = 5;
        return false;
    }
    return false;
};

Quoridor.prototype.closeAccess = function (fence) {
    'use strict';
    // We close the concerned accesses (by setting them to false)
    if (fence.horizontal) {
        this.board[fence.a][fence.b + 1].access.up = false;
        this.board[fence.a + 1][fence.b + 1].access.up = false;
        this.board[fence.a][fence.b].access.down = false;
        this.board[fence.a + 1][fence.b].access.down = false;
    } else {
        this.board[fence.a][fence.b].access.right = false;
        this.board[fence.a][fence.b + 1].access.right = false;
        this.board[fence.a + 1][fence.b].access.left = false;
        this.board[fence.a + 1][fence.b + 1].access.left = false;
    }
    // We'll know if we're isolating any pawn by returning this function
    return this.validPawns();
};

Quoridor.prototype.openAccess = function (fence) {
    'use strict';
    // We open the accesses concerned by setting them to the position's object (Player or Square)
    if (fence.horizontal) {
        this.board[fence.a][fence.b + 1].access.up = this.getPosition(fence.a, fence.b);
        this.board[fence.a + 1][fence.b + 1].access.up = this.getPosition(fence.a + 1, fence.b);
        this.board[fence.a][fence.b].access.down = this.getPosition(fence.a, fence.b + 1);
        this.board[fence.a + 1][fence.b].access.down = this.getPosition(fence.a + 1, fence.b + 1);
    } else {
        this.board[fence.a][fence.b].access.right = this.getPosition(fence.a + 1, fence.b);
        this.board[fence.a][fence.b + 1].access.right = this.getPosition(fence.a + 1, fence.b + 1);
        this.board[fence.a + 1][fence.b].access.left = this.getPosition(fence.a, fence.b);
        this.board[fence.a + 1][fence.b + 1].access.left = this.getPosition(fence.a, fence.b + 1);
    }
    return true;
};

User.prototype.setName = function (name) {
    'use strict';
    if (name === undefined) { name = jQuery('#name').val(); }
    if (name === '') { name = 'You'; }
    this.name = name;
};

User.prototype.displayName = function () {
    'use strict';
    jQuery('.name', this.caption).text(this.name);
};