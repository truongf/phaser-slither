const inputMessage = document.getElementById('inputMessage');
const messages = document.getElementById('messages');
window.addEventListener('keydown', event => {
  if (event.which === 13) {
    sendMessage();
  }
  if (event.which === 32) {
    if (document.activeElement === inputMessage) {
      inputMessage.value = inputMessage.value + ' ';
    }
  }
});
function sendMessage() {
  let message = inputMessage.value;
  if (message) {
    inputMessage.value = '';
    $.ajax({
      type: 'POST',
      url: '/submit-chatline',
      data: {
        message,
        refreshToken: getCookie('refreshJwt')
      },
      success: function(data) {},
      error: function(xhr) {
        console.log(xhr);
      }
    })
  }
}
function addMessageElement(el) {
  messages.append(el);
  messages.lastChild.scrollIntoView();
}

class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'BootScene',
      active: true
    });
  }

  preload() {
    // map tiles
    this.load.image('tiles', 'assets/map/spritesheet-extruded.png');
    // map in json format
    this.load.tilemapTiledJSON('map', 'assets/map/map.json');
    // our two characters
    this.load.image('player', 'assets/images/circle.png');
    //  enemies
    this.load.image('invader', 'assets/images/invader2.png');
    this.load.image('demon', 'assets/images/food.png');
    this.load.image('sword', 'assets/images/attack-icon.png');
    this.load.image('body', 'assets/images/circle-sm.png');
  }

  create() {
    this.scene.start('WorldScene');
  }
}
//  Direction consts
var score = 0;
var scoreText;
var gameOver = false;
var notiText;
var camRatio = 1;

class WorldScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'WorldScene'
    });
  }

  create() {
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    // create map
    this.createMap();
    // create player animations
    // this.createAnimations();
    // user input
    this.cursors = this.input.keyboard.createCursorKeys();

    // create enemies
    this.createEnemies();
    
    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '15px', fill: '#000' });

    // listen for web socket events
    this.socket.on('currentPlayers', function (players) {
      Object.keys(players).forEach(function (id) {
        if (players[id].playerId === this.socket.id) {
          this.createPlayer(players[id]);
        } else {
          this.addOtherPlayers(players[id]);
        }
      }.bind(this));
    }.bind(this));
    this.socket.on('newPlayer', function (playerInfo) {
      this.addOtherPlayers(playerInfo);
    }.bind(this));

    this.socket.on('disconnect_player', function (playerId) {
      console.log(playerId);
      this.otherPlayers.getChildren().forEach(function (player) {
        if (playerId === player.playerId) {
          player.destroy();
        }
      }.bind(this));
    }.bind(this));

    this.socket.on('playerMoved', function (playerInfo) {
      this.otherPlayers.getChildren().forEach(function (player) {
        if (playerInfo.playerId === player.playerId) {
          player.flipX = playerInfo.flipX;
          player.setPosition(playerInfo.x, playerInfo.y);
          player.setScale(playerInfo.size);
        }
      }.bind(this));
    }.bind(this));
    this.socket.on('new message', (data) => {
      const usernameSpan = document.createElement('span');
      const usernameText = document.createTextNode(data.username);
      usernameSpan.className = 'username';
      usernameSpan.appendChild(usernameText);
      const messageBodySpan = document.createElement('span');
      const messageBodyText = document.createTextNode(data.message);
      messageBodySpan.className = 'messageBody';
      messageBodySpan.appendChild(messageBodyText);
      const messageLi = document.createElement('li');
      messageLi.setAttribute('username', data.username);
      messageLi.append(usernameSpan);
      messageLi.append(messageBodySpan);
      addMessageElement(messageLi);
    });
  }

  addOtherPlayers(playerInfo) {
    const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player', 9);
    otherPlayer.setSize(10, 10)
    otherPlayer.setScale(0.2)
    otherPlayer.setTint(Math.random() * 0xffffff);
    otherPlayer.playerId = playerInfo.playerId;
    this.otherPlayers.add(otherPlayer);
  }

  onMeetOtherPlayer(player, otherPlayer) {
    this.physics.pause();
    this.player.setTintFill(0xffffff);
    gameOver = true;
    this.add.text(player.x * 2, player.y, 'Gameover', { fontSize: '30px', fill: '#000' });
    setTimeout(() => {
      this.player.destroy();
    }, 3000);
  }

  createMap() {
    // create the map
    this.map = this.make.tilemap({
      key: 'map'
    });
    // first parameter is the name of the tilemap in tiled
    var tiles = this.map.addTilesetImage('spritesheet', 'tiles', 16, 16, 1, 2);
    // creating the layers
    this.map.createStaticLayer('Grass', tiles, 0, 0);
    this.map.createStaticLayer('Obstacles', tiles, 0, 0);
    // don't go out of the map
    this.physics.world.bounds.width = this.map.widthInPixels;
    this.physics.world.bounds.height = this.map.heightInPixels;
  }

  createAnimations() {
    //  animation with key 'left', we don't need left and right as we will use one and flip the sprite
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [1, 7, 1, 13]
      }),
      frameRate: 10,
      repeat: -1
    });
    // animation with key 'right'
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [1, 7, 1, 13]
      }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [2, 8, 2, 14]
      }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers('player', {
        frames: [0, 6, 0, 12]
      }),
      frameRate: 10,
      repeat: -1
    });
  }

  createPlayer(playerInfo) {
    // our player sprite created through the physics system
    const { x, y, size } = playerInfo;
    this.player = this.add.sprite(0, 0, 'player', 6);
    this.player.size = size;
    this.player.setScale(size);
    this.player.heading = 'left'
  
    this.player.headPosition = new Phaser.Geom.Point(x, y);
    this.player.body = this.add.group();
    this.player.head = this.player.body.create(x * 16, y * 16, 'body');
    this.player.head.setOrigin(0);
    this.player.tail = new Phaser.Geom.Point(x, y);

  
    this.container = this.add.container(x, y);
    this.container.setSize(16, 16);
    this.physics.world.enable(this.container);
    this.container.add(this.player);

    // update camera
    this.updateCamera();
    // don't go out of the map
    this.container.body.setCollideWorldBounds(true);
    // this.physics.add.collider(this.container, this.spawns);
    this.physics.add.collider(this.container, this.otherPlayers, this.onMeetOtherPlayer, false, this);
    this.physics.add.overlap(this.container, this.spawns, this.onMeetEnemy, false, this);

    // move player
    this.timedEvent = this.time.addEvent({
      delay: 0,
      callback: this.movePlayer,
      callbackScope: this,
      loop: true
    });
  }

  movePlayer() {
    switch (this.player.heading) {
      case 'left':
        this.container.body.setVelocityX(-60);
        break;
      case 'right':
        this.container.body.setVelocityX(60);
        break;
      case 'up':
        this.container.body.setVelocityY(-60);
        break;
      case 'down':
        this.container.body.setVelocityY(60);
        break;
      default:
        break;
    }
  }

  updateCamera() {
    // limit camera to map
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.container);
    this.cameras.main.roundPixels = true; // avoid tile bleed
  }

  createEnemies() {
    var colors = [ 0xef658c, 0xff9a52, 0xffdf00, 0x31ef8c, 0x21dfff, 0x31aade, 0x5275de, 0x9c55ad, 0xbd208c ];
    // where the enemies will be
    this.spawns = this.physics.add.group({
      classType: Phaser.GameObjects.Sprite
    });
    for (var i = 0; i < 100; i++) {
      const location = this.getValidLocation();
      // parameters are x, y, width, height
      var enemy = this.spawns.create(location.x, location.y, 'invader');
      enemy.setTint(Phaser.Utils.Array.GetRandom(colors));
      enemy.setScale(Phaser.Math.FloatBetween(0.25, 0.35));
      enemy.body.setCollideWorldBounds(true);
      enemy.body.setImmovable();
    }
  }

  moveEnemies () {
    this.spawns.getChildren().forEach((enemy) => {
      const randNumber = Math.floor((Math.random() * 4) + 1);
      switch(randNumber) {
        case 1:
          enemy.body.setVelocityX(50);
          break;
        case 2:
          enemy.body.setVelocityX(-50);
          break;
        case 3:
          enemy.body.setVelocityY(50);
          break;
        case 4:
          enemy.body.setVelocityY(50);
          break;
        default:
          enemy.body.setVelocityX(50);
      }
    });
    setTimeout(() => {
      this.spawns.setVelocityX(0);
      this.spawns.setVelocityY(0);
    }, 500);
  }

  getEnemySprite() {
    var sprites = ['golem', 'ent', 'demon', 'worm', 'wolf'];
    return sprites[Math.floor(Math.random() * sprites.length)];
  }

  getValidLocation() {
    var validLocation = false;
    var x, y;
    while (!validLocation) {
      x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
      y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
      var occupied = false;
      this.spawns.getChildren().forEach((child) => {
        if (child.getBounds().contains(x, y)) {
          occupied = true;
        }
      });
      if (!occupied) validLocation = true;
    }
    return { x, y };
  }

  onMeetEnemy(player, enemy) {
    const location = this.getValidLocation();
    enemy.x = location.x;
    enemy.y = location.y;
    score += 10;
    scoreText.setText('Score: ' + score);
    this.increPlayerSize();
  }

  increPlayerSize() {
    this.player.size += 0.01;
    this.player.setScale(this.player.size);
    this.zoomOutCamera()
  }

  zoomOutCamera() {
    camRatio-=0.01;
    this.cameras.main.zoomTo(camRatio, 200);
  }

  update() {
    if (gameOver) return;
    if (this.container) {
      this.container.body.setVelocity(0);
      // Horizontal movement
      if (this.cursors.left.isDown) {
        this.container.body.setVelocityX(-80);
        this.player.heading = 'left';
      } else if (this.cursors.right.isDown) {
        this.container.body.setVelocityX(80);
        this.player.heading = 'right';
      }
      // Vertical movement
      if (this.cursors.up.isDown) {
        this.container.body.setVelocityY(-80);
        this.player.heading = 'up';
      } else if (this.cursors.down.isDown) {
        this.container.body.setVelocityY(80);
        this.player.heading = 'down';
      }
      // Update the animation last and give left/right animations precedence over up/down animations
      if (this.cursors.left.isDown) {
        // this.player.anims.play('left', true);
        this.player.flipX = true;
      } else if (this.cursors.right.isDown) {
        // this.player.anims.play('right', true);
        this.player.flipX = false;
      } else if (this.cursors.up.isDown) {
        // this.player.anims.play('up', true);
      } else if (this.cursors.down.isDown) {
        // this.player.anims.play('down', true);
      } else {
        // this.player.anims.stop();
      }

      if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && !this.attacking && document.activeElement !== inputMessage) {
        this.attacking = true;
        setTimeout(() => {
          this.attacking = false;
          this.weapon.angle = 0;
        }, 150);
      }

      if (this.attacking) {
        if (this.weapon.flipX) {
          this.weapon.angle -= 10;
        } else {
          this.weapon.angle += 10;
        }
      }

      // emit player movement
      const { x, y } = this.container;
      const { flipX, size } = this.player;
      if (this.container.oldPosition && 
        (x !== this.container.oldPosition.x || 
          y !== this.container.oldPosition.y || 
          flipX !== this.container.oldPosition.flipX || 
          size !== this.container.oldPosition.size)
      ) {
        this.socket.emit('playerMovement', { x, y, size });
      }
      // save old position data
      this.container.oldPosition = {
        x: this.container.x,
        y: this.container.y,
        flipX: this.player.flipX,
        size: this.player.size
      };
    }
  }
}

var config = {
  type: Phaser.AUTO,
  parent: 'content',
  width: 320,
  height: 240,
  zoom: 3,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {
        y: 0
      },
      debug: true // set to true to view zones
    }
  },
  scene: [
    BootScene,
    WorldScene
  ]
};
var game = new Phaser.Game(config);