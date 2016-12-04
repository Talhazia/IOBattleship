var Ship = require('./Ship.js');
var Options = require('./Options.js');

/**
 * Player constructor
 * @param {type} id Socket ID
 */
function Player(id) {
    var i;

    this.id = id;
    this.shots = Array(Options.gridRows * Options.gridCols);
    this.shipGrid = Array(Options.gridRows * Options.gridCols);
    this.ships = [];

    for(i = 0; i < Options.gridRows * Options.gridCols; i++) {
        this.shots[i] = 0;
        this.shipGrid[i] = -1;
    }

    if(!this.createRandomShips()) {
        // Random placement of ships failed. Use fallback layout (should rarely happen).
        this.ships = [];
        this.createShips();
    }
};

/**
 * Fire shot on grid
 * @param {type} gridIndex
 * @returns {Boolean} True if hit
 */
Player.prototype.shoot = function(gridIndex) {
    if(this.shipGrid[gridIndex] >= 0) {
        // Hit!
        this.ships[this.shipGrid[gridIndex]].hits++;
        this.shots[gridIndex] = 2;
        return true;
    } else {
        // Miss
        this.shots[gridIndex] = 1;
        return false;
    }
};

/**
 * Get an array of sunk ships
 * @returns {undefined}
 */
Player.prototype.getSunkShips = function() {
    var i, sunkShips = [];

    for(i = 0; i < this.ships.length; i++) {
        if(this.ships[i].isSunk()) {
            sunkShips.push(this.ships[i]);
        }
    }

    return sunkShips;
};

/**
 * Get the number of ships left
 * @returns {Number} Number of ships left
 */
Player.prototype.getShipsLeft = function() {
    var i, shipCount = 0;

    for(i = 0; i < this.ships.length; i++) {
        if(!this.ships[i].isSunk()) {
            shipCount++;
        }
    }

    return shipCount;
}

/**
 * Create ships and place them randomly in grid
 * @returns {Boolean}
 */
Player.prototype.createRandomShips = function() {
    var shipIndex;

    for(shipIndex = 0; shipIndex < Options.ships.length; shipIndex++) {
        ship = new Ship(Options.ships[shipIndex]);

        if(!this.placeShipRandom(ship, shipIndex)) {
            return false;
        }

        this.ships.push(ship);
    }

    return true;
};

/**
 * Try to place a ship randomly in grid without overlapping another ship.
 * @param {Ship} ship
 * @param {Number} shipIndex
 * @returns {Boolean}
 */
Player.prototype.placeShipRandom = function(ship, shipIndex) {
    var i, j, gridIndex, xMax, yMax, tryMax = 25;

    for(i = 0; i < tryMax; i++) {
        ship.horizontal = Math.random() < 0.5;

        xMax = ship.horizontal ? Options.gridCols - ship.size + 1 : Options.gridCols;
        yMax = ship.horizontal ? Options.gridRows : Options.gridRows - ship.size + 1;

        ship.x = Math.floor(Math.random() * xMax);
        ship.y = Math.floor(Math.random() * yMax);

        if(!this.checkShipOverlap(ship) && !this.checkShipAdjacent(ship)) {
            // success - ship does not overlap or is adjacent to other ships
            // place ship array-index in shipGrid
            gridIndex = ship.y * Options.gridCols + ship.x;
            for(j = 0; j < ship.size; j++) {
                this.shipGrid[gridIndex] = shipIndex;
                gridIndex += ship.horizontal ? 1 : Options.gridCols;
            }
            return true;
        }
    }

    return false;
}

/**
 * Check if a ship overlaps another ship in the grid.
 * @param {Ship} ship
 * @returns {Boolean} True if ship overlaps
 */
Player.prototype.checkShipOverlap = function(ship) {
    var i, gridIndex = ship.y * Options.gridCols + ship.x;

    for(i = 0; i < ship.size; i++) {
        if(this.shipGrid[gridIndex] >= 0) {
            return true;
        }
        gridIndex += ship.horizontal ? 1 : Options.gridCols;
    }

    return false;
}

/**
 * Check if there are ships adjacent to this ship placement
 * @param {Ship} ship
 * @returns {Boolean} True if adjacent ship found
 */
Player.prototype.checkShipAdjacent = function(ship) {
    var i, j,
        x1 = ship.x - 1,
        y1 = ship.y - 1,
        x2 = ship.horizontal ? ship.x + ship.size : ship.x + 1,
        y2 = ship.horizontal ? ship.y + 1 : ship.y + ship.size;

    for(i = x1; i <= x2; i++) {
        if(i < 0 || i > Options.gridCols - 1) continue;
        for(j = y1; j <= y2; j++) {
            if(j < 0 || j > Options.gridRows - 1) continue;
            if(this.shipGrid[j * Options.gridCols + i] >= 0) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Create ships and place them in grid in a prearranged layout
 */
Player.prototype.createShips = function() {
    var shipIndex, i, gridIndex, ship,
        x = [1, 3, 5, 8, 8], y = [1, 2, 5, 2, 8],
        horizontal = [false, true, false, false, true];

    for(shipIndex = 0; shipIndex < Options.ships.length; shipIndex++) {
        ship = new Ship(Options.ships[shipIndex]);
        ship.horizontal = horizontal[shipIndex];
        ship.x = x[shipIndex];
        ship.y = y[shipIndex];

        // place ship array-index in shipGrid
        gridIndex = ship.y * Options.gridCols + ship.x;
        for(i = 0; i < ship.size; i++) {
            this.shipGrid[gridIndex] = shipIndex;
            gridIndex += ship.horizontal ? 1 : Options.gridCols;
        }

        this.ships.push(ship);
    }
};


module.exports = Player;