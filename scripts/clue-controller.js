app.controller("clueCtrl", function($scope, $log, $interval, TestService, RestService) {
    var self = this;
    
    // cg-busy
    self.delay = 0;
    self.minDuration = 0;
    self.message = 'Please Wait...';
    self.backdrop = false;
    self.promise = null;
    
    var id = null;
    self.myPlayer = null;
    self.myCards = null;
    self.testMyPlayer = null;
    self.gameStart = false;
    self.joinedAfterStart = false;
    self.host = false;
    self.player = {};
    self.testGamePieces = TestService.testGetGamePieces();
        
    var MapSizeX = 5;
    var MapSizeY = 5;
    
    self.pieceSelected = function(piece) {
        TestService.testAddPlayer(piece);
        self.testPlayers = TestService.testGetPlayers();
        self.testMyPlayer = piece;
        
        //first player to select a piece becomes 'host' and is the only player that can start the game
        if (self.testMyPlayer == self.testPlayers[0]) {
            self.host = true;
        }
        
        self.myPlayer = {
            "board_piece": piece.name
        }
        
        self.addPlayer(self.myPlayer);
    };
    
    self.initGame = function() {
        self.playerCount = 0;
        self.testPlayers = TestService.testGetPlayers();

        //Get current gameboard, if none exists createGameBoard() is called
        //after getting the gameboard, getPlayers() is called
        self.getGameBoard();
        
    };
    
    self.startGame = function() {
        self.curPlayer = self.testPlayers[0]; //Miss Scarlet goes first    
        self.startGameBoard();
    };
    
    self.getGameBoard = function () {
        self.promise = RestService.get('game_boards');
        self.promise.then(
            function (response) {
                self.game_boards = response.data;
                if (self.game_boards.length == 0) {
                    self.createGameBoard();
                }
                else {
                    self.game_board = response.data[0];
                    self.getPlayers();
                    
                    //if game already started
                    if (self.game_board.game_in_play) {
                        self.gameStart = true;
                        self.joinedAfterStart = true;
                    }
                    
                    console.log(self.game_board);
                }
            },
            function (error) {
            }
        )
    };
    
    self.createGameBoard = function () {
        self.promise = RestService.post('game_boards', '');
        self.promise.then(
            function (response) {
                self.game_board = response.data;
                console.log(response);
                self.getPlayers();
            },
            function (error) {
            }
        )
    };
    
    self.getPlayers = function () {
        self.promise = RestService.get('players');
        self.promise.then(
            function (response) {
                self.serverPlayers = response.data;
                console.log(self.serverPlayers);
                if (!self.gameStart) {
                    self.playerCount = self.serverPlayers.length;
                    self.setPiecesTaken();
                }
                if (self.gameStart) {
                    self.findLocations();
                }
            },
            function (error) {
            }
        )
    };
    
    self.addPlayer = function (player) {
        console.log(player);
        self.promise = RestService.post('players', player);
        self.promise.then(
            function (response) {
                self.serverPlayers = response.data;
                self.playerCount = self.serverPlayers.length;
                self.setPiecesTaken();
                console.log(self.serverPlayers);
                self.findMyPlayerId();
            },
            function (error) {
                alert("Player Taken or No Game Created!")
            }
        )
    };
    
    self.deleteGameBoard = function () {
        self.promise = RestService.delete('game_boards');
        self.promise.then(
            function (response) {
                self.reset();
            },
            function (error) {
            }
        )   
    };
    
    self.startGameBoard = function () {
        self.promise = RestService.post('game_boards/start_game', '');
        self.promise.then(
            function (response) {
                self.gameStart=true;
                console.log(response);
                self.getPlayerById();
                self.findLocations();
            },
            function (error) {
            }
        )
    }
    
    self.getPlayerById = function () {
        self.promise = RestService.getOne('players', id);
        self.promise.then(
            function (response) {
                self.myCards = response.data.cards;
                console.log(self.myCards);
            },
            function (error) {
            }
        )
    }
    
    //set game pieces to taken so that a user cannot click on a button for that character
    self.setPiecesTaken = function () {
        for (var i=0; i<self.playerCount; i++) {
            for (var j=0; j<self.testGamePieces.length; j++) {
                if (self.serverPlayers[i].board_piece.name == self.testGamePieces[j].name)  {   
                    self.testGamePieces[j].isTaken = true;
                }
            }
        }
    }
    self.reset = function () {
        for (var j=0; j<self.testGamePieces.length; j++) {
            self.testGamePieces[j].isTaken = false;
        }
        self.game_board = null;
        self.playerCount = 0;
        self.gameStart = false;
        self.joinedAfterStart = false;
    }
    
    self.findMyPlayerId = function () {
        for (var i=0; i<self.playerCount; i++) {
            if (self.serverPlayers[i].board_piece.name == self.myPlayer.board_piece) {
                id = self.serverPlayers[i].id;
            }
        }
    }
    
    self.findLocations = function () {
        for (var i=0; i<self.playerCount; i++) {
            var obj = TestService.MapLocationIdToXY(self.serverPlayers[i].location_id);
//            console.log(obj);
            self.serverPlayers[i].x = obj.x;
            self.serverPlayers[i].y = obj.y;
        }
        console.log(self.serverPlayers);
    }
    /*
        Need to add: checkMove() to check if hallway is occupied, handle secret pathways
    */
    
    
    //update coordinates of player, curPlayer is now next player to update turn
    self.makeMove = function (direction) {
        if (direction == "up"){
            if (self.curPlayer.y > 0 && self.curPlayer.x%2 == 0){
                self.curPlayer.y--;
            }
            else{
                console.log('invalid move');
                return;
            }
        }
        else if (direction == "down") {
            if (self.curPlayer.y < MapSizeY-1 && self.curPlayer.x%2 == 0) {
                self.curPlayer.y++;
            }
            else {
                console.log('invalid move');
                return;
            }
        }
        else if (direction == "left") {
            if (self.curPlayer.x > 0 && self.curPlayer.y%2 == 0) {
                self.curPlayer.x--;
            }
            else {
                console.log('invalid move');
                return;
            }
        }
        else if (direction == "right") {
            if (self.curPlayer.x < MapSizeX-1 && self.curPlayer.y%2 == 0) {
                self.curPlayer.x++;
            }
            else {
                console.log('invalid move');
                return;
            }
        }
            
        console.log(self.curPlayer.name + ' is moving ' + direction + '!');
        TestService.testUpdatePlayers(self.curPlayer);
        
        var index = self.testPlayers.indexOf(self.curPlayer) + 1;
        if (index>self.testPlayers.length-1) 
            index = 0;
        
        self.curPlayer = self.testPlayers[index];
    }
    
    //Turned off for developing, calls getPlayers every 2 seconds
//    $interval((function () {
//        self.getPlayers();
//    }), 2000)
    
    self.initGame();
})