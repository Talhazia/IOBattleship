var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var BattleshipGame = require('./battleship/BattleshipGame.js');
var GameState = require("./battleship/GameState.js");

var index = require('./routes/index');

var Entities = require('html-entities').AllHtmlEntities;

var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);

var entities = new Entities();

var UsersObj = {};
var gameIDCounter = 1;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(function (req, res, next) {
    res.io = io;
    next();
});
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
//app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// SOCKET CONNECTIONS
io.on('connection', function (socket) {
    log('ID ' + socket.id + ' connected.');

    UsersObj[socket.id] = {
        isInGame: null,
        player: null
    };

    socket.join('waiting room');

    socket.on('shot', function (pos) {
        var game = UsersObj[socket.id].isInGame, enemy;

        if (game !== null) {
            if (game.currentPlayer === UsersObj[socket.id].player) {
                enemy = game.currentPlayer === 0 ? 1 : 0;

                if (game.shoot(pos)) {
                    CheckForGameOver(game);


                    io.to(socket.id).emit('update', game.getGameState(UsersObj[socket.id].player, enemy));
                    io.to(game.getPlayerID(enemy)).emit('update', game.getGameState(enemy, enemy));
                }
            }
        }
    });

    socket.on('leave', function () {
        if (UsersObj[socket.id].isInGame !== null) {
            LeaveGame(socket);
            socket.join('waiting room');
            InitWaitingList();
        }
    });

    socket.on('disconnect', function () {
        log('ID ' + socket.id + ' disconnected.');

        LeaveGame(socket);

        delete UsersObj[socket.id];
    });

    InitWaitingList();
});
// SOCKET CONNECTIONS

function log(mssg) {
    console.log((new Date().toISOString()) + ": " + mssg);
}

function LeaveGame(socket) {
    if (UsersObj[socket.id].isInGame !== null) {
        log('ID ' + socket.id + ' left game ID ' + UsersObj[socket.id].isInGame.id);

        // Notifty opponent
        socket.broadcast.to('game' + UsersObj[socket.id].isInGame.id).emit('notification', {
            message: 'Opponent has left the game'
        });

        if (UsersObj[socket.id].isInGame.gameState !== GameState.isGameOver) {
            // Game is unfinished, abort it.
            UsersObj[socket.id].isInGame.abortGame(UsersObj[socket.id].player);
            CheckForGameOver(UsersObj[socket.id].isInGame);
        }

        socket.leave('game' + UsersObj[socket.id].isInGame.id);

        UsersObj[socket.id].isInGame = null;
        UsersObj[socket.id].player = null;

        io.to(socket.id).emit('leave');
    }
}

function CheckForGameOver(game) {
    if (game.gameState === GameState.isGameOver) {
        log('Game ID ' + game.id + ' ended.');
        io.to(game.getWinnerId()).emit('gameover', true);
        io.to(game.getLoserId()).emit('gameover', false);
    }
}

function InitWaitingList() {
    var players = GetLobbyClients('waiting room');

    if(players.length >= 2) {
     // 2 player waiting. Create new game!
     var game = new BattleshipGame(gameIDCounter++, players[0].id, players[1].id);

     // create new room for this game
     players[0].leave('waiting room');
     players[1].leave('waiting room');
     players[0].join('game' + game.id);
     players[1].join('game' + game.id);

     UsersObj[players[0].id].player = 0;
     UsersObj[players[1].id].player = 1;
     UsersObj[players[0].id].isInGame = game;
     UsersObj[players[1].id].isInGame = game;

     io.to('game' + game.id).emit('join', game.id);

     // send initial ship placements
     io.to(players[0].id).emit('update', game.getGameState(0, 0));
     io.to(players[1].id).emit('update', game.getGameState(1, 1));

     log(players[0].id + " and " + players[1].id + " have joined game ID " + game.id);
     }
}

function GetLobbyClients(room) {
    var clients = [];
    for (var id in io.sockets.adapter.rooms[room].sockets) {
        clients.push(io.sockets.adapter.nsp.connected[id]);
    }
    return clients;
}

module.exports = {app: app, server: server};
