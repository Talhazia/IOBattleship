var controllers = angular.module('BattleshipGame.Controllers', []);

controllers.controller('GameController', function($scope, Socket, $log, Game, $timeout, $mdDialog) {
    $scope.isConnectedToServer = false;
    $scope.isGameVisible = false;
    $scope.gameNumber = null;

    var waitingDialog = {
        contentElement: '#waitingDialog',
        parent: angular.element(document.body),
        targetEvent: '',
        clickOutsideToClose: false
    };

    Socket.on('connect', function() {
        $log.info("Connected to server.");
        $scope.isConnectedToServer = true;
        $mdDialog.show(waitingDialog);
    });

    Socket.on('disconnect', function() {
        $log.info("Disconnected from server.");
        $scope.isConnectedToServer = false;
        $scope.isGameVisible = false;
        $mdDialog.show(waitingDialog);
    });

    Socket.on('join', function(GameID) {
        $scope.isConnectedToServer = true;
        $scope.isGameVisible = true;
        $scope.gameNumber = GameID;
        $mdDialog.hide();

        $timeout(function() {
            Game.initGame();
        });
    });

    Socket.on('update', function(GameState) {
        Game.setTurn(GameState.turn);
        Game.updateGrid(GameState.gridIndex, GameState.grid);
    });

    Socket.on('gameover', function(isWinner) {
        Game.setGameOver(isWinner);
    });

    Socket.on('leave', function() {
        $scope.isGameVisible = false;
    });
});