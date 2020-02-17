let config = {
	type: Phaser.AUTO,
	width: 1024,
	height: 640,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: {
				y: 1000
			},
			debug: true
		}
	},
	scene: {
		preload: preload,
		create: create,
		update: update
	}
};

let game = new Phaser.Game(config);

const canvasWidth = config.width;
const canvasHeight = config.height;
const arialFont = 'Arial';

let gameoverSound;
let jumpSound;
let coinsSound;
let bounceSound;

let background;

let ground;
let platforms;
let trampoline;
let grid = [
	['0','0','0','0','0','0','0','0'],
	['0','0','0','0','0','0','0','0'],
	['p2','p3','0','0','0','0','0','0'],
	['0','0','0','0','0','p1','p2','p3'],
	['g','g','g','g','g','g','g','g']
];

let player;
let score = 0;
let stars;
let bombs;

let cursors;

let text_score;
let text_gameOver;
let button_replay;

function preload() {
	this.load.image('background', 'assets/images/background.png');

	this.load.image('ground', 'assets/images/tiles/ground.png');
	this.load.image('platform1', 'assets/images/tiles/platform1.png');
	this.load.image('platform2', 'assets/images/tiles/platform2.png');
	this.load.image('platform3', 'assets/images/tiles/platform3.png');
	this.load.image('crate', 'assets/images/objects/crate.png');
	this.load.image('mushroom', 'assets/images/objects/mushroom2.png');

	this.load.image('star', 'assets/images/objects/star.png');
	this.load.image('bomb', 'assets/images/objects/bomb.png');

	this.load.spritesheet('dude','assets/images/dude.png', {
		frameWidth: 32,
		frameHeight: 48
	});

	this.load.audio('gameOver', 'assets/sounds/game-over.wav');
	this.load.audio('jump', 'assets/sounds/jump.wav');
	this.load.audio('eatCoins', 'assets/sounds/coins.wav');
	this.load.audio('bounce', 'assets/sounds/bounce.wav');
}

function create() {

	/*********************** SYSTEM ***********************/
	cursors = this.input.keyboard.createCursorKeys();
	/******************************************************/

	/*********************** SOUNDS ***********************/
	gameoverSound = this.sound.add('gameOver');
	jumpSound = this.sound.add('jump');
	coinsSound = this.sound.add('eatCoins');
	bounceSound = this.sound.add('bounce');
	/******************************************************/

	background = this.add.image(canvasWidth / 2, canvasHeight / 2, 'background');

	/*********************** MAP ***********************/
	ground = this.physics.add.staticGroup();
	platforms = this.physics.add.staticGroup();
	trampoline = this.physics.add.staticGroup();
	for (let line = 0; line < grid.length; line++) {
		for (let col = 0; col < grid[line].length; col++) {
			if (grid[line][col] !== '0') {
				if (grid[line][col] === 'g') {
					ground.create(col*128+(128/2), line*128+(128/2), 'ground');
				} else if (grid[line][col] === 'p1') {
					platforms.create(col*128+(128/2), line*93+(93/2), 'platform1');
				} else if (grid[line][col] === 'p2') {
					platforms.create(col*128+(128/2), line*93+(93/2), 'platform2');
				} else if (grid[line][col] === 'p3') {
					platforms.create(col*128+(128/2), line*93+(93/2), 'platform3');
				}
			}
		}
	}
	platforms.create(canvasWidth/2, canvasHeight-128*2, 'crate');
	trampoline.create(300, canvasHeight-128-20.5, 'mushroom');
	/***************************************************/

	/*********************** BOMBS ********************/
	bombs = this.physics.add.group();
	this.physics.add.collider(bombs, ground);
	this.physics.add.collider(bombs, platforms);
	this.physics.add.collider(bombs, trampoline);

	function createBomb() {
		let x = (player.x < 500) ? Phaser.Math.Between(500, 1000) : Phaser.Math.Between(0, 500);
		let bomb = bombs.create(x, 0, 'bomb');
		bomb.setBounce(1);
		bomb.setCollideWorldBounds(true);
		bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
		bomb.allowGravity = false;
	}
	/**************************************************/

	/*********************** STARS ********************/
	stars = this.physics.add.group({
		key: 'star',
		repeat: 11,
		setXY: {
			x: Math.floor(Math.random() * (150 - 15 + 1)) + 15,
			y: 0,
			stepX: 70
		}
	});

	stars.children.iterate(function (child) {
		child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
	});

	this.physics.add.collider(stars, ground);
	this.physics.add.collider(stars, platforms);
	this.physics.add.collider(stars, trampoline);
	/**************************************************/

	/*********************** PLAYER ********************/
	player = this.physics.add.sprite(100, 150, 'dude');

	player.setBounce(0.3);
	player.setCollideWorldBounds(true);
	player.body.setGravityY(50);
	this.physics.add.collider(player, bombs, hitBomb, null, this);
	this.physics.add.overlap(player, stars, collectStar, null, this);
	this.physics.add.collider(player, ground);
	this.physics.add.collider(player, platforms);
	this.physics.add.collider(player, trampoline, () => {
		player.setVelocityY(-800);
		bounceSound.play();
	}, null, this);

	this.anims.create({
		key: 'left',
		frames: this.anims.generateFrameNumbers('dude', {
		start: 0,
		end: 3
		}),
		frameRate: 10,
		repeat: -1
	});

	this.anims.create({
		key: 'turn',
		frames: [{
		key: 'dude',
		frame: 4
		}],
		frameRate: 20
	});

	this.anims.create({
		key: 'right',
		frames: this.anims.generateFrameNumbers('dude', {
		start: 5,
		end: 8
		}),
		frameRate: 10,
		repeat: -1
	});

	function collectStar(player, star) {
		star.disableBody(true, true);

		coinsSound.play();

		score += 100;

		text_score.setText('Score: ' + score);

		if (stars.countActive(true) === 0) {

			stars.children.iterate(function (child) {
				child.enableBody(true, child.x, 0, true, true);
			});

			createBomb();
		}
	}

	function hitBomb(player, bomb) {
		this.physics.pause();

		player.setTint(0xff0000);

		player.anims.play('turn');

		gameOver = true;

		gameoverSound.play();

		text_gameOver = this.add.text(255, 80, 'GAME OVER', {
			fontSize: '90px',
			fontFamily: arialFont,
			fontStyle: 'bold',
			fill: '#663300'
		});

		button_replay = this.add.text(415, 210, 'REPLAY', {
			fontSize: '45px',
			fontFamily: arialFont,
			fontStyle: 'bold',
			fill: '#b3d02a',
			fontStyle: 'bold'
		}).setInteractive().on('pointerdown', () => this.scene.restart());
	}

	text_score = this.add.text(16, 16, 'SCORE: 0', {
		fontSize: '2.5em',
		fontFamily: arialFont,
		fontStyle: 'bold',
		fill: '#996633'
	});
	/**************************************************/
}

function update() {
	if (cursors.left.isDown) {

		player.setVelocityX(-165);
		player.anims.play('left', true);

	} else if (cursors.right.isDown) {

		player.setVelocityX(165);
		player.anims.play('right', true);

	} else {

		player.setVelocityX(0);
		player.anims.play('turn');

	}

	if (cursors.space.isDown && player.body.touching.down) {

		player.setVelocityY(-650);
		jumpSound.play();

	}
}